import type { FastifyInstance } from 'fastify';
import { authController } from './auth.controller.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  refreshTokenSchema,
} from './auth.schema.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register a new user',
      body: registerSchema,
    },
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    handler: authController.register,
  });

  app.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login with email and password',
      body: loginSchema,
    },
    config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
    handler: authController.login,
  });

  app.post('/logout', {
    schema: { tags: ['Auth'], summary: 'Logout and invalidate refresh token' },
    handler: authController.logout,
  });

  app.post('/refresh', {
    schema: {
      tags: ['Auth'],
      summary: 'Refresh access token using refresh token cookie',
      body: refreshTokenSchema,
    },
    handler: authController.refreshToken,
  });

  app.post('/forgot-password', {
    schema: {
      tags: ['Auth'],
      summary: 'Request a password reset email',
      body: forgotPasswordSchema,
    },
    config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
    handler: authController.forgotPassword,
  });

  app.post('/reset-password', {
    schema: {
      tags: ['Auth'],
      summary: 'Reset password using secure token',
      body: resetPasswordSchema,
    },
    handler: authController.resetPassword,
  });

  app.post('/verify-email', {
    schema: {
      tags: ['Auth'],
      summary: 'Verify email address using token',
      body: verifyEmailSchema,
    },
    handler: authController.verifyEmail,
  });
}
