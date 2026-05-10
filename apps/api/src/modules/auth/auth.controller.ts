import type { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service.js';
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.schema.js';

export const authController = {
  register: async (
    request: FastifyRequest<{ Body: RegisterInput }>,
    reply: FastifyReply,
  ) => {
    const result = await authService.register(request.body);
    return reply.status(201).send({
      data: result,
      meta: { message: 'Registration successful. Please check your email to verify your account.' },
      error: null,
    });
  },

  login: async (
    request: FastifyRequest<{ Body: LoginInput }>,
    reply: FastifyReply,
  ) => {
    const result = await authService.login(
      request.body,
      request.ip,
      request.headers['user-agent'],
    );

    // Set refresh token as HttpOnly cookie
    reply.setCookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 3600, // 7 days
    });

    return reply.send({
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
      meta: null,
      error: null,
    });
  },

  logout: async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies['refresh_token'];
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    reply.clearCookie('refresh_token', { path: '/api/v1/auth' });
    return reply.send({ data: { message: 'Logged out successfully' }, meta: null, error: null });
  },

  refreshToken: async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies['refresh_token'];
    if (!refreshToken) {
      return reply.status(401).send({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'No refresh token provided' },
      });
    }
    const result = await authService.refreshToken(refreshToken);
    return reply.send({ data: result, meta: null, error: null });
  },

  forgotPassword: async (
    request: FastifyRequest<{ Body: ForgotPasswordInput }>,
    reply: FastifyReply,
  ) => {
    await authService.forgotPassword(request.body);
    return reply.send({
      data: { message: 'If an account exists with this email, a password reset link has been sent.' },
      meta: null,
      error: null,
    });
  },

  resetPassword: async (
    request: FastifyRequest<{ Body: ResetPasswordInput }>,
    reply: FastifyReply,
  ) => {
    await authService.resetPassword(request.body);
    return reply.send({
      data: { message: 'Password reset successful. Please login with your new password.' },
      meta: null,
      error: null,
    });
  },

  verifyEmail: async (
    request: FastifyRequest<{ Body: VerifyEmailInput }>,
    reply: FastifyReply,
  ) => {
    await authService.verifyEmail(request.body);
    return reply.send({
      data: { message: 'Email verified successfully. You can now login.' },
      meta: null,
      error: null,
    });
  },
};
