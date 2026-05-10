import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env.js';
import { AppError, ErrorCodes } from '../../lib/error-handler.js';
import { redis } from '../../lib/redis.js';
import { sendEmail } from '../../lib/email.js';
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.schema.js';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const RESET_TOKEN_EXPIRY_HOURS = 2;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export class AuthService {
  // ── Token Generation ─────────────────────────────────────────

  generateAccessToken(payload: { userId: string; role: string; email: string }): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
      algorithm: 'HS256',
    });
  }

  generateRefreshToken(payload: { userId: string; sessionId: string }): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
      algorithm: 'HS256',
    });
  }

  verifyAccessToken(token: string): { userId: string; role: string; email: string } {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        userId: string;
        role: string;
        email: string;
      };
    } catch {
      throw new AppError(ErrorCodes.TOKEN_EXPIRED, 'Access token is invalid or expired', 401);
    }
  }

  verifyRefreshToken(token: string): { userId: string; sessionId: string } {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as {
        userId: string;
        sessionId: string;
      };
    } catch {
      throw new AppError(ErrorCodes.TOKEN_EXPIRED, 'Refresh token is invalid or expired', 401);
    }
  }

  async revokeToken(token: string, expiresInSeconds: number): Promise<void> {
    await redis.setex(`blocklist:${token}`, expiresInSeconds, '1');
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    const result = await redis.get(`blocklist:${token}`);
    return result !== null;
  }

  // ── Account Lockout ──────────────────────────────────────────

  private loginAttemptsKey(email: string) {
    return `login_attempts:${email}`;
  }

  async checkAccountLockout(email: string): Promise<void> {
    const attempts = await redis.get(this.loginAttemptsKey(email));
    if (attempts && parseInt(attempts) >= MAX_LOGIN_ATTEMPTS) {
      throw new AppError(
        ErrorCodes.ACCOUNT_SUSPENDED,
        `Account temporarily locked. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.`,
        429,
      );
    }
  }

  async recordFailedLogin(email: string): Promise<void> {
    const key = this.loginAttemptsKey(email);
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, LOCKOUT_DURATION_MINUTES * 60);
    }
  }

  async clearLoginAttempts(email: string): Promise<void> {
    await redis.del(this.loginAttemptsKey(email));
  }

  // ── Register ─────────────────────────────────────────────────

  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      throw new AppError(ErrorCodes.ALREADY_EXISTS, 'An account with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 3600 * 1000);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: input.role as any,
          status: 'PENDING_VERIFICATION',
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          email: input.email,
          token: verificationToken,
          expiresAt: tokenExpiry,
        },
      });

      // Create profile based on role
      if (input.role === 'CUSTOMER') {
        await tx.customerProfile.create({
          data: {
            userId: newUser.id,
            firstName: input.firstName,
            lastName: input.lastName,
          },
        });
      }

      return newUser;
    });

    // Send verification email (non-blocking)
    sendEmail({
      to: user.email,
      template: 'email-verification',
      data: {
        verificationUrl: `${env.APP_URL}/verify-email?token=${verificationToken}`,
        firstName: input.firstName ?? 'there',
      },
    }).catch(console.error);

    return { userId: user.id, email: user.email };
  }

  // ── Login ────────────────────────────────────────────────────

  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    await this.checkAccountLockout(input.email);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.passwordHash) {
      await this.recordFailedLogin(input.email);
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      await this.recordFailedLogin(input.email);
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    if (user.status === 'PENDING_VERIFICATION') {
      throw new AppError(ErrorCodes.EMAIL_NOT_VERIFIED, 'Please verify your email address', 403);
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError(ErrorCodes.ACCOUNT_SUSPENDED, 'Your account has been suspended', 403);
    }

    await this.clearLoginAttempts(input.email);

    // Create session
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken: crypto.randomBytes(64).toString('hex'), // placeholder, replaced below
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days
      },
    });

    const accessToken = this.generateAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    const refreshToken = this.generateRefreshToken({
      userId: user.id,
      sessionId: session.id,
    });

    // Update session with actual refresh token
    await prisma.userSession.update({
      where: { id: session.id },
      data: { refreshToken },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  // ── Logout ───────────────────────────────────────────────────

  async logout(refreshToken: string): Promise<void> {
    const session = await prisma.userSession.findUnique({ where: { refreshToken } });
    if (session) {
      await prisma.userSession.delete({ where: { id: session.id } });
    }
    // Revoke for 7 days (max refresh token lifetime)
    await this.revokeToken(refreshToken, 7 * 24 * 3600);
  }

  // ── Refresh Token ─────────────────────────────────────────────

  async refreshToken(refreshToken: string) {
    if (await this.isTokenRevoked(refreshToken)) {
      throw new AppError(ErrorCodes.TOKEN_EXPIRED, 'Refresh token has been revoked', 401);
    }

    const payload = this.verifyRefreshToken(refreshToken);

    const session = await prisma.userSession.findFirst({
      where: { id: payload.sessionId, refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError(ErrorCodes.TOKEN_EXPIRED, 'Session expired, please login again', 401);
    }

    const newAccessToken = this.generateAccessToken({
      userId: session.user.id,
      role: session.user.role,
      email: session.user.email,
    });

    return { accessToken: newAccessToken };
  }

  // ── Password Reset ───────────────────────────────────────────

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // Always respond OK to prevent email enumeration
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 3600 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    await sendEmail({
      to: user.email,
      template: 'password-reset',
      data: {
        resetUrl: `${env.APP_URL}/reset-password?token=${token}`,
      },
    });
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token: input.token },
    });

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Password reset link is invalid or has expired',
        400,
      );
    }

    const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all active sessions
      prisma.userSession.deleteMany({
        where: { userId: tokenRecord.userId },
      }),
    ]);
  }

  // ── Email Verification ───────────────────────────────────────

  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const tokenRecord = await prisma.emailVerificationToken.findUnique({
      where: { token: input.token },
    });

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Verification link is invalid or has expired',
        400,
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email: tokenRecord.email },
        data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }
}

export const authService = new AuthService();
