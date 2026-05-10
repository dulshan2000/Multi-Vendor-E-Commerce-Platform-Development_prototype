import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Standard error codes
export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Business Logic
  INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
  CART_EXPIRED: 'CART_EXPIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  ORDER_NOT_CANCELLABLE: 'ORDER_NOT_CANCELLABLE',
  VENDOR_NOT_APPROVED: 'VENDOR_NOT_APPROVED',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(422).send({
      data: null,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        details: error.flatten().fieldErrors,
      },
    });
  }

  // Application errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      data: null,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  // Fastify validation errors
  if ('statusCode' in error && error.statusCode === 400 && 'validation' in error) {
    return reply.status(400).send({
      data: null,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: (error as FastifyError).validation,
      },
    });
  }

  // Unexpected errors
  logger.error(
    {
      err: error,
      requestId: request.id,
      method: request.method,
      url: request.url,
    },
    'Unhandled error',
  );

  return reply.status(500).send({
    data: null,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
  });
}
