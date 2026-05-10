import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { vendorRoutes } from './modules/vendor/vendor.routes.js';
import { productRoutes, categoryRoutes } from './modules/catalog/product.routes.js';
import { cartRoutes } from './modules/cart/cart.routes.js';
import { orderRoutes, paymentRoutes } from './modules/order/order.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { settlementRoutes, analyticsRoutes } from './modules/settlement/settlement.routes.js';
import { couponRoutes, returnRoutes, wishlistRoutes } from './modules/marketing/marketing.routes.js';
import { flashSaleRoutes, behavioralRoutes, reportRoutes } from './modules/marketing/growth.routes.js';
import { realtimeRoutes } from './modules/realtime/realtime.routes.js';
import { startAbandonedCartWorker, startReportWorker } from './lib/queue.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { errorHandler } from './lib/error-handler.js';
import { logger } from './lib/logger.js';
import { ensureIndices } from './lib/elasticsearch.js';

export async function buildServer() {
  const app = Fastify({
    logger: false, // We use our own pino logger
    trustProxy: true,
    ajv: {
      customOptions: {
        strict: 'log',
        keywords: ['kind', 'modifier'],
      },
    },
  });

  // ── Security ────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false, // Managed at CDN level
  });

  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    global: false, // Applied per-route for granular control
    redis: env.REDIS_URL,
  });

  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
    parseOptions: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    },
  });

  // ── API Documentation ───────────────────────────────────────
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'MarkComm Multi-Vendor Platform API',
        description: 'REST API for the Mark & Comm multi-vendor e-commerce platform',
        version: '1.0.0',
      },
      servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
  });

  // ── Error Handling ──────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  // ── Routes ──────────────────────────────────────────────────
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(vendorRoutes, { prefix: '/api/v1/vendors' });
  await app.register(categoryRoutes, { prefix: '/api/v1/categories' });
  await app.register(productRoutes, { prefix: '/api/v1/products' });
  await app.register(orderRoutes, { prefix: '/api/v1/orders' });
  await app.register(cartRoutes, { prefix: '/api/v1/cart' });
  await app.register(paymentRoutes, { prefix: '/api/v1/payments' });
  await app.register(searchRoutes, { prefix: '/api/v1/search' });
  await app.register(settlementRoutes, { prefix: '/api/v1/settlements' });
  await app.register(analyticsRoutes, { prefix: '/api/v1/analytics' });
  await app.register(couponRoutes, { prefix: '/api/v1/coupons' });
  await app.register(returnRoutes, { prefix: '/api/v1/returns' });
  await app.register(wishlistRoutes, { prefix: '/api/v1/wishlist' });
  await app.register(flashSaleRoutes, { prefix: '/api/v1/flash-sales' });
  await app.register(behavioralRoutes, { prefix: '/api/v1/behavioral' });
  await app.register(reportRoutes, { prefix: '/api/v1/reports' });
  await app.register(realtimeRoutes, { prefix: '/api/v1/realtime' });

  return app;
}

async function start() {
  try {
    const server = await buildServer();
    const address = await server.listen({ port: env.PORT, host: '0.0.0.0' });

    // Ensure Elasticsearch indices exist (non-blocking)
    ensureIndices().then(() => logger.info('Elasticsearch indices ready'));

    // Start BullMQ background workers
    startAbandonedCartWorker();
    startReportWorker();
    logger.info('⚡ Background workers started (abandoned-cart, report-generation)');

    logger.info(`🚀 API Server running at ${address}`);
    logger.info(`📖 API Docs: ${address}/docs`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

start();
