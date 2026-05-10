import type { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { redis } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';

// ── Channel naming convention ──────────────────────────────────
// order:<orderId>  — customer subscribes for their order updates
// vendor:<vendorId> — vendor subscribes for incoming order notifications

export function orderChannel(orderId: string) { return `order:${orderId}`; }
export function vendorChannel(vendorId: string) { return `vendor:${vendorId}`; }

// ── Publisher (called by order service after status change) ────

export async function publishOrderUpdate(orderId: string, payload: {
  orderId: string;
  status: string;
  vendorOrderId?: string;
  trackingNumber?: string;
  message: string;
  timestamp: string;
}) {
  const channel = orderChannel(orderId);
  await redis.publish(channel, JSON.stringify(payload));
  logger.debug({ channel, status: payload.status }, 'Order update published');
}

export async function publishVendorNotification(vendorId: string, payload: {
  type: 'NEW_ORDER' | 'ORDER_CANCELLED';
  orderId: string;
  orderNumber: string;
  total: number;
  currency: string;
  itemCount: number;
  timestamp: string;
}) {
  const channel = vendorChannel(vendorId);
  await redis.publish(channel, JSON.stringify(payload));
  logger.debug({ channel, type: payload.type }, 'Vendor notification published');
}

// ── WebSocket route plugin ─────────────────────────────────────

export async function realtimeRoutes(app: FastifyInstance) {
  await app.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576, // 1 MB
    },
  });

  // ── Order tracking WebSocket ─────────────────────────────────
  // ws://api/api/v1/realtime/orders/:orderId
  app.get('/orders/:orderId', {
    schema: { tags: ['Realtime'], summary: 'WebSocket: subscribe to real-time order status updates' },
    websocket: true,
    handler: async (socket, req) => {
      const { orderId } = req.params as { orderId: string };
      const channel = orderChannel(orderId);

      logger.info({ orderId, ip: req.ip }, 'WebSocket client connected for order tracking');

      // Dedicated subscriber connection for this WebSocket
      const subscriber = redis.duplicate();
      await subscriber.subscribe(channel);

      const onMessage = (message: string, receivedChannel: string) => {
        if (receivedChannel === channel && socket.readyState === socket.OPEN) {
          socket.send(message);
        }
      };

      subscriber.on('message', onMessage);

      // Send initial ping
      socket.send(JSON.stringify({ type: 'CONNECTED', orderId, timestamp: new Date().toISOString() }));

      // Heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() }));
        }
      }, 30_000);

      socket.on('close', async () => {
        clearInterval(heartbeat);
        subscriber.off('message', onMessage);
        await subscriber.unsubscribe(channel);
        subscriber.disconnect();
        logger.info({ orderId }, 'WebSocket client disconnected');
      });

      socket.on('error', (err) => {
        logger.error({ err, orderId }, 'WebSocket error');
      });
    },
  });

  // ── Vendor notification WebSocket ────────────────────────────
  // ws://api/api/v1/realtime/vendors/:vendorId
  app.get('/vendors/:vendorId', {
    schema: { tags: ['Realtime'], summary: 'WebSocket: vendor receives new order notifications' },
    websocket: true,
    handler: async (socket, req) => {
      const { vendorId } = req.params as { vendorId: string };
      const channel = vendorChannel(vendorId);

      logger.info({ vendorId }, 'Vendor WebSocket client connected');

      const subscriber = redis.duplicate();
      await subscriber.subscribe(channel);

      const onMessage = (message: string, receivedChannel: string) => {
        if (receivedChannel === channel && socket.readyState === socket.OPEN) {
          socket.send(message);
        }
      };

      subscriber.on('message', onMessage);
      socket.send(JSON.stringify({ type: 'CONNECTED', vendorId, timestamp: new Date().toISOString() }));

      const heartbeat = setInterval(() => {
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() }));
        }
      }, 30_000);

      socket.on('close', async () => {
        clearInterval(heartbeat);
        subscriber.off('message', onMessage);
        await subscriber.unsubscribe(channel);
        subscriber.disconnect();
        logger.info({ vendorId }, 'Vendor WebSocket disconnected');
      });
    },
  });
}
