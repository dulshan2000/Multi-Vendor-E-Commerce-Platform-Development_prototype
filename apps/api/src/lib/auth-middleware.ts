import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { authService } from '../modules/auth/auth.service.js';
import { AppError, ErrorCodes } from './error-handler.js';
import type { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
  }

  const token = authHeader.slice(7);

  if (await authService.isTokenRevoked(token)) {
    throw new AppError(ErrorCodes.TOKEN_EXPIRED, 'Token has been revoked', 401);
  }

  const payload = authService.verifyAccessToken(token);
  request.user = payload as AuthenticatedUser;
}

export function requireRoles(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
    }
    if (!roles.includes(request.user.role)) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'You do not have permission to perform this action', 403);
    }
  };
}

export function optionalAuthenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
) {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = authService.verifyAccessToken(token);
      request.user = payload as AuthenticatedUser;
    } catch {
      // Silently ignore — optional auth
    }
  }
  done();
}
