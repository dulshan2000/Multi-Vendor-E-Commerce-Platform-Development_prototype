import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Cookies
  COOKIE_SECRET: z.string().min(32),

  // AWS
  AWS_REGION: z.string().default('ap-southeast-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().default('markcomm-dev-assets'),
  S3_PUBLIC_URL: z.string().url().optional().or(z.literal('')).transform(v => v || undefined),
  CLOUDFRONT_URL: z.string().url().optional().or(z.literal('')).transform(v => v || undefined),

  // Email
  SES_FROM_EMAIL: z.string().email(),
  AWS_SES_SMTP_USER: z.string().optional(),   // SES SMTP credentials (production)
  AWS_SES_SMTP_PASS: z.string().optional(),

  // Stripe (international payments — optional for dev)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // PayHere — Primary Sri Lankan payment gateway (optional for dev)
  PAYHERE_MERCHANT_ID: z.string().optional().default('sandbox'),
  PAYHERE_MERCHANT_SECRET: z.string().optional().default('sandbox_secret'),
  PAYHERE_SANDBOX: z.string().default('true').transform((v) => v === 'true'),

  // Mock payments — set true in dev to skip all real gateway calls
  // POST /api/v1/payments/mock-confirm?orderId=xxx instantly confirms an order
  MOCK_PAYMENTS: z.string().default('true').transform((v) => v === 'true'),

  // Dialog Genie (optional Sri Lankan digital wallet)
  GENIE_API_KEY: z.string().optional(),
  GENIE_MERCHANT_CODE: z.string().optional(),

  // FriMi — Nations Trust Bank wallet (optional)
  FRIMI_API_KEY: z.string().optional(),
  FRIMI_MERCHANT_ID: z.string().optional(),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // Elasticsearch
  ELASTICSEARCH_URL: z.string().url().default('http://localhost:9200'),
  ELASTICSEARCH_API_KEY: z.string().optional(),

  // App
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),

  // Sri Lanka Tax
  LK_VAT_RATE: z.coerce.number().default(0.18),  // 18% VAT
  LK_NBT_RATE: z.coerce.number().default(0.02),  // 2% Nation Building Tax
  LK_DEFAULT_CURRENCY: z.string().default('LKR'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
