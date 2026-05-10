import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import crypto from 'crypto';

const s3 = new S3Client({
  region: env.AWS_REGION, // ap-southeast-1 (Singapore)
  ...(env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

// ── Presigned Upload URL ───────────────────────────────────────

interface PresignedUploadOptions {
  folder: string;         // e.g. "vendors/v_123/documents"
  fileName: string;
  contentType: string;
  maxSizeBytes?: number;  // default 10MB
  expiresIn?: number;     // seconds, default 300
}

interface PresignedUploadResult {
  uploadUrl: string;
  s3Key: string;
  publicUrl: string;
  expiresAt: Date;
}

export async function createPresignedUploadUrl(
  options: PresignedUploadOptions,
): Promise<PresignedUploadResult> {
  const { folder, fileName, contentType, maxSizeBytes = 10 * 1024 * 1024, expiresIn = 300 } = options;

  // Sanitize filename and generate unique key
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const s3Key = `${folder}/${uniqueId}-${safeFileName}`;

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: s3Key,
    ContentType: contentType,
    ContentLength: maxSizeBytes,
    // Server-side encryption
    ServerSideEncryption: 'AES256',
    // Tag for lifecycle management
    Tagging: 'category=user-upload',
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  // Public URL via CloudFront or S3 public URL
  const publicUrl = env.CLOUDFRONT_URL
    ? `${env.CLOUDFRONT_URL}/${s3Key}`
    : `${env.S3_PUBLIC_URL}/${s3Key}`;

  logger.debug({ s3Key, folder }, 'Generated presigned upload URL');

  return { uploadUrl, s3Key, publicUrl, expiresAt };
}

// ── Presigned Download URL (for private documents) ─────────────

export async function createPresignedDownloadUrl(
  s3Key: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: s3Key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

// ── Delete Object ──────────────────────────────────────────────

export async function deleteS3Object(s3Key: string): Promise<void> {
  try {
    await s3.send(
      new DeleteObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: s3Key }),
    );
    logger.debug({ s3Key }, 'Deleted S3 object');
  } catch (error) {
    logger.error({ error, s3Key }, 'Failed to delete S3 object');
    throw error;
  }
}

// ── URL helpers ────────────────────────────────────────────────

export function s3KeyToPublicUrl(s3Key: string): string {
  if (env.CLOUDFRONT_URL) return `${env.CLOUDFRONT_URL}/${s3Key}`;
  return `${env.S3_PUBLIC_URL}/${s3Key}`;
}

// ── Folder paths ───────────────────────────────────────────────

export const S3Folders = {
  vendorDocuments: (vendorId: string) => `vendors/${vendorId}/documents`,
  vendorLogo: (vendorId: string) => `vendors/${vendorId}/branding`,
  vendorBanner: (vendorId: string) => `vendors/${vendorId}/branding`,
  productImages: (vendorId: string, productId: string) =>
    `vendors/${vendorId}/products/${productId}`,
  returnPhotos: (orderId: string) => `orders/${orderId}/returns`,
} as const;
