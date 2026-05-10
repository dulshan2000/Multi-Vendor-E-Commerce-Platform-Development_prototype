import type { FastifyInstance } from 'fastify';
import { authenticate, requireRoles } from '../../lib/auth-middleware.js';
import { vendorController } from './vendor.controller.js';
import {
  step1BusinessSchema,
  step2DocumentSchema,
  step3PayoutSchema,
  step4StoreSetupSchema,
  approveVendorSchema,
  rejectVendorSchema,
  suspendVendorSchema,
  inviteStaffSchema,
  uploadUrlSchema,
} from './vendor.schema.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function vendorRoutes(app: FastifyInstance) {
  // ── Admin: List all vendors ─────────────────────────────────
  app.get('/', {
    schema: {
      tags: ['Vendors'],
      summary: 'List all vendors (admin)',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'SUSPENDED', 'REJECTED'] },
          search: { type: 'string' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: vendorController.listVendors,
  });

  // ── Register as a vendor ─────────────────────────────────────
  app.post('/', {
    schema: {
      tags: ['Vendors'],
      summary: 'Start vendor registration (creates an onboarding session)',
    },
    preHandler: [authenticate],
    handler: vendorController.register,
  });

  // ── Get vendor profile ───────────────────────────────────────
  app.get('/:id', {
    schema: { tags: ['Vendors'], summary: 'Get vendor profile by ID' },
    handler: vendorController.getVendorProfile,
  });

  // ── Onboarding progress ──────────────────────────────────────
  app.get('/:id/onboarding', {
    schema: { tags: ['Vendors'], summary: 'Get onboarding progress and step status' },
    preHandler: [authenticate],
    handler: vendorController.getOnboardingProgress,
  });

  // ── Onboarding: Step 1 — Business Information ────────────────
  app.put('/:id/onboarding/business-info', {
    schema: {
      tags: ['Vendors', 'Onboarding'],
      summary: 'Step 1: Save business information',
      body: zodToJsonSchema(step1BusinessSchema),
    },
    preHandler: [authenticate],
    handler: vendorController.saveBusinessInfo,
  });

  // ── Onboarding: Step 2 — Documents ───────────────────────────
  app.put('/:id/onboarding/documents', {
    schema: {
      tags: ['Vendors', 'Onboarding'],
      summary: 'Step 2: Submit verification document S3 keys (upload via presigned URL first)',
      body: zodToJsonSchema(step2DocumentSchema),
    },
    preHandler: [authenticate],
    handler: vendorController.saveDocuments,
  });

  // ── Onboarding: Step 3 — Payout Account ──────────────────────
  app.put('/:id/onboarding/payout', {
    schema: {
      tags: ['Vendors', 'Onboarding'],
      summary: 'Step 3: Set up payout bank account (Sri Lankan banks: Sampath, BOC, HNB, etc.)',
      body: zodToJsonSchema(step3PayoutSchema),
    },
    preHandler: [authenticate],
    handler: vendorController.savePayoutAccount,
  });

  // ── Onboarding: Step 4 — Store Setup ─────────────────────────
  app.put('/:id/onboarding/store', {
    schema: {
      tags: ['Vendors', 'Onboarding'],
      summary: 'Step 4: Configure storefront (name, slug, description, branding)',
      body: zodToJsonSchema(step4StoreSetupSchema),
    },
    preHandler: [authenticate],
    handler: vendorController.saveStoreSetup,
  });

  // ── Onboarding: Step 5 — Shipping Config ─────────────────────
  app.put('/:id/onboarding/shipping', {
    schema: {
      tags: ['Vendors', 'Onboarding'],
      summary: 'Step 5: Configure shipping carriers and rates (Domex, PickMe, Lanka Post, Kapruka, DHL, FedEx)',
      body: {
        type: 'object',
        required: ['localCarriers', 'codAvailable', 'estimatedDispatchDays'],
        properties: {
          localCarriers: {
            type: 'array',
            items: { type: 'string', enum: ['DOMEX', 'PICKME_DELIVERY', 'LANKA_POST', 'KAPRUKA', 'STORE_PICKUP'] },
            minItems: 1,
          },
          internationalCarriers: {
            type: 'array',
            items: { type: 'string', enum: ['DHL', 'FEDEX', 'ARAMEX_LK'] },
          },
          freeShippingThreshold: { type: 'number', description: 'LKR amount above which shipping is free' },
          codAvailable: { type: 'boolean', description: 'Whether Cash on Delivery is offered' },
          estimatedDispatchDays: { type: 'integer', minimum: 1, maximum: 30 },
        },
      },
    },
    preHandler: [authenticate],
    handler: vendorController.saveShippingConfig,
  });

  // ── Onboarding: Step 6 — Policy Agreement ────────────────────
  app.put('/:id/onboarding/policies', {
    schema: {
      tags: ['Vendors', 'Onboarding'],
      summary: 'Step 6: Accept platform policies, commission agreement, and SLA',
      body: {
        type: 'object',
        required: ['acceptedTerms', 'acceptedCommissionPolicy', 'acceptedSLA'],
        properties: {
          acceptedTerms: { type: 'boolean', const: true },
          acceptedCommissionPolicy: { type: 'boolean', const: true },
          acceptedSLA: { type: 'boolean', const: true },
        },
      },
    },
    preHandler: [authenticate],
    handler: vendorController.acceptPolicies,
  });

  // ── Onboarding: Step 7 — Submit for Review ───────────────────
  app.post('/:id/onboarding/submit', {
    schema: {
      tags: ['Vendors', 'Onboarding'],
      summary: 'Step 7: Submit vendor application for admin review',
    },
    preHandler: [authenticate],
    handler: vendorController.submitForReview,
  });

  // ── Upload presigned URL ─────────────────────────────────────
  app.post('/:id/upload-url', {
    schema: {
      tags: ['Vendors'],
      summary: 'Get a presigned S3 upload URL for documents, logo, or banner',
      body: zodToJsonSchema(uploadUrlSchema),
    },
    preHandler: [authenticate],
    handler: vendorController.getUploadUrl,
  });

  // ── Admin: Approve vendor ────────────────────────────────────
  app.post('/:id/approve', {
    schema: {
      tags: ['Vendors', 'Admin'],
      summary: 'Approve a vendor application (admin only)',
      body: zodToJsonSchema(approveVendorSchema),
    },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: vendorController.approveVendor,
  });

  // ── Admin: Reject vendor ─────────────────────────────────────
  app.post('/:id/reject', {
    schema: {
      tags: ['Vendors', 'Admin'],
      summary: 'Reject a vendor application (admin only)',
      body: zodToJsonSchema(rejectVendorSchema),
    },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: vendorController.rejectVendor,
  });

  // ── Admin: Suspend vendor ────────────────────────────────────
  app.post('/:id/suspend', {
    schema: {
      tags: ['Vendors', 'Admin'],
      summary: 'Suspend an approved vendor (admin only)',
      body: zodToJsonSchema(suspendVendorSchema),
    },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: vendorController.suspendVendor,
  });

  // ── Admin: Reinstate vendor ──────────────────────────────────
  app.post('/:id/reinstate', {
    schema: {
      tags: ['Vendors', 'Admin'],
      summary: 'Reinstate a suspended vendor (admin only)',
    },
    preHandler: [authenticate, requireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')],
    handler: vendorController.reinstateVendor,
  });

  // ── Staff: Invite team member ────────────────────────────────
  app.post('/:id/staff/invite', {
    schema: {
      tags: ['Vendors', 'Staff'],
      summary: 'Invite a staff member to a vendor account',
      body: zodToJsonSchema(inviteStaffSchema),
    },
    preHandler: [authenticate, requireRoles('VENDOR_OWNER')],
    handler: vendorController.inviteStaff,
  });

  // ── Analytics ────────────────────────────────────────────────
  app.get('/:id/analytics', {
    schema: {
      tags: ['Vendors', 'Analytics'],
      summary: 'Get vendor analytics summary',
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['today', '7d', '30d', '90d'] },
          from: { type: 'string', format: 'date' },
          to: { type: 'string', format: 'date' },
        },
      },
    },
    preHandler: [authenticate],
    handler: async (_req, reply) =>
      reply.send({
        data: {
          revenue: { amount: 0, currency: 'LKR' },
          ordersCount: 0,
          averageOrderValue: { amount: 0, currency: 'LKR' },
          conversionRate: 0,
          pendingPayoutAmount: { amount: 0, currency: 'LKR' },
          period: '30d',
        },
        meta: null,
        error: null,
      }),
  });
}
