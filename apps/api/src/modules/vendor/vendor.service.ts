import { PrismaClient, type VendorStatus, type Prisma } from '@prisma/client';
import { AppError, ErrorCodes } from '../../lib/error-handler.js';
import { createPresignedUploadUrl, deleteS3Object, S3Folders, s3KeyToPublicUrl } from '../../lib/storage.js';
import { sendEmail } from '../../lib/email.js';
import { redis } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';
import type {
  Step1BusinessInput,
  Step2DocumentInput,
  Step3PayoutInput,
  Step4StoreSetupInput,
  ApproveVendorInput,
  RejectVendorInput,
  SuspendVendorInput,
  InviteStaffInput,
  UploadUrlInput,
} from './vendor.schema.js';

const prisma = new PrismaClient();

// ── Onboarding step ordering ───────────────────────────────────

const ONBOARDING_STEPS = [
  'business_info',      // Step 1: Legal business details
  'documents',          // Step 2: Upload verification docs
  'payout_setup',       // Step 3: Sri Lankan bank account
  'store_setup',        // Step 4: Storefront customisation
  'shipping_config',    // Step 5: Carrier selection + rates
  'policy_agreement',   // Step 6: Platform policies & SLA
  'review',             // Step 7: Submit for admin review
] as const;

type OnboardingStep = typeof ONBOARDING_STEPS[number];

// ── Onboarding progress cache key ─────────────────────────────
const onboardingKey = (vendorId: string) => `onboarding:${vendorId}`;

export const vendorService = {
  // ── Registration ─────────────────────────────────────────────

  async register(userId: string) {
    // Check user doesn't already have a vendor profile
    const existing = await prisma.vendorProfile.findFirst({
      where: { userId },
    });
    if (existing) {
      throw new AppError(
        ErrorCodes.CONFLICT,
        'You already have a vendor account',
        409,
      );
    }

    const vendor = await prisma.vendorProfile.create({
      data: {
        userId,
        businessName: '',
        status: 'PENDING',
        onboardingStep: 'business_info',
        onboardingCompletedAt: null,
      },
    });

    // Cache fresh onboarding state
    await redis.setex(
      onboardingKey(vendor.id),
      86400, // 24h
      JSON.stringify({ currentStep: 'business_info', completedSteps: [] }),
    );

    logger.info({ vendorId: vendor.id, userId }, 'Vendor registration started');
    return vendor;
  },

  // ── Onboarding: Step 1 — Business Information ─────────────────

  async saveBusinessInfo(vendorId: string, data: Step1BusinessInput) {
    const vendor = await this.getVendorOrThrow(vendorId);
    this.assertOnboardingStepAllowed(vendor.onboardingStep as OnboardingStep, 'business_info');

    const updated = await prisma.vendorProfile.update({
      where: { id: vendorId },
      data: {
        businessName: data.businessName,
        businessType: data.businessType,
        businessRegNo: data.businessRegNo,
        taxNumber: data.taxNumber,
        phone: data.phone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        district: data.district,
        province: data.province,
        postalCode: data.postalCode,
        website: data.website,
        onboardingStep: 'documents',
      },
    });

    await this.updateOnboardingCache(vendorId, 'business_info');
    logger.info({ vendorId }, 'Onboarding step 1 (business info) saved');
    return updated;
  },

  // ── Onboarding: Step 2 — Document Submission ──────────────────

  async saveDocuments(vendorId: string, data: Step2DocumentInput) {
    const vendor = await this.getVendorOrThrow(vendorId);
    this.assertOnboardingStepAllowed(vendor.onboardingStep as OnboardingStep, 'documents');

    // Delete any previously uploaded docs of the same type
    await prisma.vendorDocument.deleteMany({ where: { vendorId } });

    // Create document records
    await prisma.vendorDocument.createMany({
      data: data.documentKeys.map((doc) => ({
        vendorId,
        documentType: doc.type,
        s3Key: doc.s3Key,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        status: 'PENDING_REVIEW',
      })),
    });

    await prisma.vendorProfile.update({
      where: { id: vendorId },
      data: { onboardingStep: 'payout_setup' },
    });

    await this.updateOnboardingCache(vendorId, 'documents');
    logger.info({ vendorId, count: data.documentKeys.length }, 'Onboarding step 2 (documents) saved');
    return { message: 'Documents submitted for review' };
  },

  // ── Onboarding: Step 3 — Payout Account ──────────────────────

  async savePayoutAccount(vendorId: string, data: Step3PayoutInput) {
    const vendor = await this.getVendorOrThrow(vendorId);
    this.assertOnboardingStepAllowed(vendor.onboardingStep as OnboardingStep, 'payout_setup');

    await prisma.payoutAccount.upsert({
      where: { vendorId },
      create: {
        vendorId,
        accountType: data.accountType,
        accountName: data.accountName,
        bankName: data.bankName,
        branchCode: data.branchCode,
        accountNumber: data.accountNumber,
        paypalEmail: data.paypalEmail,
        isVerified: false,
      },
      update: {
        accountType: data.accountType,
        accountName: data.accountName,
        bankName: data.bankName,
        branchCode: data.branchCode,
        accountNumber: data.accountNumber,
        paypalEmail: data.paypalEmail,
        isVerified: false, // Reset verification on change
      },
    });

    await prisma.vendorProfile.update({
      where: { id: vendorId },
      data: { onboardingStep: 'store_setup' },
    });

    await this.updateOnboardingCache(vendorId, 'payout_setup');
    logger.info({ vendorId }, 'Onboarding step 3 (payout) saved');
    return { message: 'Payout account saved' };
  },

  // ── Onboarding: Step 4 — Store Setup ─────────────────────────

  async saveStoreSetup(vendorId: string, data: Step4StoreSetupInput) {
    const vendor = await this.getVendorOrThrow(vendorId);
    this.assertOnboardingStepAllowed(vendor.onboardingStep as OnboardingStep, 'store_setup');

    // Check slug is unique
    const slugExists = await prisma.vendorStorefront.findFirst({
      where: { slug: data.slug, NOT: { vendorId } },
    });
    if (slugExists) {
      throw new AppError(ErrorCodes.CONFLICT, 'This store URL is already taken. Please choose another.', 409);
    }

    await prisma.vendorStorefront.upsert({
      where: { vendorId },
      create: {
        vendorId,
        slug: data.slug,
        displayName: data.displayName,
        description: data.description,
        tagline: data.tagline,
        primaryColor: data.primaryColor,
        accentColor: data.accentColor,
        logoS3Key: data.logoS3Key,
        bannerS3Key: data.bannerS3Key,
        socialLinks: data.socialLinks as Prisma.JsonObject,
        categories: data.categories,
      },
      update: {
        slug: data.slug,
        displayName: data.displayName,
        description: data.description,
        tagline: data.tagline,
        primaryColor: data.primaryColor,
        accentColor: data.accentColor,
        logoS3Key: data.logoS3Key,
        bannerS3Key: data.bannerS3Key,
        socialLinks: data.socialLinks as Prisma.JsonObject,
        categories: data.categories,
      },
    });

    await prisma.vendorProfile.update({
      where: { id: vendorId },
      data: { onboardingStep: 'shipping_config' },
    });

    await this.updateOnboardingCache(vendorId, 'store_setup');
    logger.info({ vendorId, slug: data.slug }, 'Onboarding step 4 (store setup) saved');
    return { message: 'Store setup saved', storeUrl: `/vendor/${data.slug}` };
  },

  // ── Onboarding: Step 5 — Shipping Config ─────────────────────
  // Saves carrier preferences for Sri Lankan + international shipping

  async saveShippingConfig(
    vendorId: string,
    data: {
      localCarriers: string[];   // DOMEX, PICKME_DELIVERY, LANKA_POST, KAPRUKA
      internationalCarriers: string[]; // DHL, FEDEX, ARAMEX_LK
      freeShippingThreshold?: number;  // LKR amount for free standard shipping
      codAvailable: boolean;
      estimatedDispatchDays: number;
    },
  ) {
    const vendor = await this.getVendorOrThrow(vendorId);
    this.assertOnboardingStepAllowed(vendor.onboardingStep as OnboardingStep, 'shipping_config');

    await prisma.vendorProfile.update({
      where: { id: vendorId },
      data: {
        shippingConfig: data as unknown as Prisma.JsonObject,
        onboardingStep: 'policy_agreement',
      },
    });

    await this.updateOnboardingCache(vendorId, 'shipping_config');
    return { message: 'Shipping configuration saved' };
  },

  // ── Onboarding: Step 6 — Policy Agreement ────────────────────

  async acceptPolicies(
    vendorId: string,
    data: { acceptedTerms: true; acceptedCommissionPolicy: true; acceptedSLA: true },
  ) {
    if (!data.acceptedTerms || !data.acceptedCommissionPolicy || !data.acceptedSLA) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'All agreements must be accepted', 422);
    }

    const vendor = await this.getVendorOrThrow(vendorId);
    this.assertOnboardingStepAllowed(vendor.onboardingStep as OnboardingStep, 'policy_agreement');

    await prisma.vendorProfile.update({
      where: { id: vendorId },
      data: {
        policiesAcceptedAt: new Date(),
        onboardingStep: 'review',
      },
    });

    await this.updateOnboardingCache(vendorId, 'policy_agreement');
    return { message: 'Agreements accepted' };
  },

  // ── Onboarding: Step 7 — Submit for Review ────────────────────

  async submitForReview(vendorId: string) {
    const vendor = await this.getVendorOrThrow(vendorId);

    if (vendor.onboardingStep !== 'review') {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Please complete all onboarding steps before submitting',
        422,
      );
    }

    // Validate all required data is present
    const [storefront, payoutAccount, documents] = await Promise.all([
      prisma.vendorStorefront.findUnique({ where: { vendorId } }),
      prisma.payoutAccount.findUnique({ where: { vendorId } }),
      prisma.vendorDocument.findMany({ where: { vendorId } }),
    ]);

    if (!storefront) throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Store setup is incomplete', 422);
    if (!payoutAccount) throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Payout account is required', 422);
    if (documents.length === 0) throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Please upload required documents', 422);

    const updated = await prisma.vendorProfile.update({
      where: { id: vendorId },
      data: {
        status: 'UNDER_REVIEW',
        submittedForReviewAt: new Date(),
        onboardingCompletedAt: new Date(),
      },
    });

    // Clear onboarding cache
    await redis.del(onboardingKey(vendorId));

    // Notify the vendor
    const user = await prisma.user.findUnique({ where: { id: vendor.userId } });
    if (user) {
      await sendEmail({
        to: user.email,
        template: 'vendor-application-received',
        data: {
          firstName: user.firstName,
          businessName: vendor.businessName,
          reviewTimeframe: '2–5 business days',
        },
      });
    }

    logger.info({ vendorId }, 'Vendor application submitted for review');
    return { message: 'Application submitted for admin review. We will notify you within 2–5 business days.' };
  },

  // ── Admin: Approve vendor ─────────────────────────────────────

  async approveVendor(vendorId: string, adminId: string, data: ApproveVendorInput) {
    const vendor = await this.getVendorOrThrow(vendorId);

    if (vendor.status !== 'UNDER_REVIEW') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `Cannot approve a vendor with status: ${vendor.status}`, 422);
    }

    await prisma.$transaction(async (tx) => {
      await tx.vendorProfile.update({
        where: { id: vendorId },
        data: { status: 'APPROVED', approvedAt: new Date(), approvedByAdminId: adminId },
      });

      // Create default commission rule (10% platform fee)
      await tx.commissionRule.create({
        data: {
          vendorId,
          type: 'PERCENTAGE',
          rate: 0.10, // 10% default
          effectiveFrom: new Date(),
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'VENDOR_APPROVED',
          entityType: 'VendorProfile',
          entityId: vendorId,
          metadata: { note: data.note },
        },
      });
    });

    // Notify vendor
    const user = await prisma.user.findUnique({
      where: { id: vendor.userId },
      select: { email: true, firstName: true },
    });
    if (user) {
      await sendEmail({
        to: user.email,
        template: 'vendor-approved',
        data: { firstName: user.firstName, businessName: vendor.businessName, dashboardUrl: '/vendor/dashboard' },
      });
    }

    logger.info({ vendorId, adminId }, 'Vendor approved');
    return { message: 'Vendor approved successfully' };
  },

  // ── Admin: Reject vendor ──────────────────────────────────────

  async rejectVendor(vendorId: string, adminId: string, data: RejectVendorInput) {
    const vendor = await this.getVendorOrThrow(vendorId);

    await prisma.$transaction(async (tx) => {
      await tx.vendorProfile.update({
        where: { id: vendorId },
        data: { status: 'REJECTED', rejectionReason: data.reason },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'VENDOR_REJECTED',
          entityType: 'VendorProfile',
          entityId: vendorId,
          metadata: { reason: data.reason },
        },
      });
    });

    const user = await prisma.user.findUnique({
      where: { id: vendor.userId },
      select: { email: true, firstName: true },
    });
    if (user) {
      await sendEmail({
        to: user.email,
        template: 'vendor-rejected',
        data: { firstName: user.firstName, businessName: vendor.businessName, reason: data.reason },
      });
    }

    logger.info({ vendorId, adminId }, 'Vendor rejected');
    return { message: 'Vendor rejected' };
  },

  // ── Admin: Suspend vendor ─────────────────────────────────────

  async suspendVendor(vendorId: string, adminId: string, data: SuspendVendorInput) {
    await this.getVendorOrThrow(vendorId);

    const suspendedUntil = data.durationDays
      ? new Date(Date.now() + data.durationDays * 86400_000)
      : null;

    await prisma.$transaction(async (tx) => {
      await tx.vendorProfile.update({
        where: { id: vendorId },
        data: { status: 'SUSPENDED', suspensionReason: data.reason, suspendedUntil },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'VENDOR_SUSPENDED',
          entityType: 'VendorProfile',
          entityId: vendorId,
          metadata: { reason: data.reason, durationDays: data.durationDays, suspendedUntil },
        },
      });
    });

    // Invalidate all vendor sessions via Redis pattern
    await redis.publish('vendor:suspended', vendorId);

    logger.warn({ vendorId, adminId, suspendedUntil }, 'Vendor suspended');
    return { message: 'Vendor suspended', suspendedUntil };
  },

  // ── Admin: Reinstate vendor ───────────────────────────────────

  async reinstateVendor(vendorId: string, adminId: string) {
    await this.getVendorOrThrow(vendorId);

    await prisma.$transaction(async (tx) => {
      await tx.vendorProfile.update({
        where: { id: vendorId },
        data: { status: 'APPROVED', suspensionReason: null, suspendedUntil: null },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'VENDOR_REINSTATED',
          entityType: 'VendorProfile',
          entityId: vendorId,
          metadata: {},
        },
      });
    });

    logger.info({ vendorId, adminId }, 'Vendor reinstated');
    return { message: 'Vendor reinstated' };
  },

  // ── Presigned upload URL ──────────────────────────────────────

  async getUploadUrl(vendorId: string, data: UploadUrlInput) {
    const folderMap = {
      DOCUMENT: S3Folders.vendorDocuments(vendorId),
      LOGO: S3Folders.vendorLogo(vendorId),
      BANNER: S3Folders.vendorBanner(vendorId),
      PRODUCT_IMAGE: S3Folders.productImages(vendorId, 'temp'),
    };

    const maxSizeMap: Record<string, number> = {
      DOCUMENT: 5 * 1024 * 1024,       // 5MB for docs
      LOGO: 2 * 1024 * 1024,            // 2MB for logo
      BANNER: 5 * 1024 * 1024,          // 5MB for banner
      PRODUCT_IMAGE: 8 * 1024 * 1024,   // 8MB for product images
    };

    return createPresignedUploadUrl({
      folder: folderMap[data.purpose],
      fileName: data.fileName,
      contentType: data.contentType,
      maxSizeBytes: maxSizeMap[data.purpose],
      expiresIn: 600, // 10 minutes
    });
  },

  // ── Staff invite ──────────────────────────────────────────────

  async inviteStaff(vendorId: string, invitedByUserId: string, data: InviteStaffInput) {
    await this.getVendorOrThrow(vendorId);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });

    // Create or find a staff invitation
    const invitation = await prisma.vendorStaffInvitation.create({
      data: {
        vendorId,
        invitedEmail: data.email,
        invitedByUserId,
        permissions: data.permissions as unknown as Prisma.JsonObject,
        expiresAt: new Date(Date.now() + 7 * 86400_000), // 7 days
        acceptedAt: null,
      },
    });

    await sendEmail({
      to: data.email,
      template: 'staff-invitation',
      data: {
        inviteUrl: `${process.env['APP_URL']}/vendor/join?token=${invitation.id}`,
        vendorId,
        isExistingUser: !!existingUser,
      },
    });

    return { message: 'Invitation sent', invitationId: invitation.id };
  },

  // ── Get vendor profile (public) ───────────────────────────────

  async getVendorProfile(vendorId: string) {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: {
        storefront: true,
        commissionRules: { where: { effectiveFrom: { lte: new Date() } }, orderBy: { effectiveFrom: 'desc' }, take: 1 },
      },
    });

    if (!vendor) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Vendor not found', 404);
    }

    // Map S3 keys to public URLs
    if (vendor.storefront?.logoS3Key) {
      (vendor.storefront as Record<string, unknown>)['logoUrl'] = s3KeyToPublicUrl(vendor.storefront.logoS3Key);
    }
    if (vendor.storefront?.bannerS3Key) {
      (vendor.storefront as Record<string, unknown>)['bannerUrl'] = s3KeyToPublicUrl(vendor.storefront.bannerS3Key);
    }

    return vendor;
  },

  // ── Admin: List all vendors ───────────────────────────────────

  async listVendors(params: {
    status?: VendorStatus;
    search?: string;
    page: number;
    limit: number;
  }) {
    const { status, search, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.VendorProfileWhereInput = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { businessName: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [vendors, total] = await Promise.all([
      prisma.vendorProfile.findMany({
        where,
        include: { storefront: { select: { slug: true, displayName: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vendorProfile.count({ where }),
    ]);

    return {
      vendors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  },

  // ── Get onboarding progress ───────────────────────────────────

  async getOnboardingProgress(vendorId: string) {
    const vendor = await this.getVendorOrThrow(vendorId);
    const cached = await redis.get(onboardingKey(vendorId));

    return {
      vendorId,
      currentStep: vendor.onboardingStep,
      status: vendor.status,
      completedSteps: cached ? JSON.parse(cached).completedSteps : [],
      totalSteps: ONBOARDING_STEPS.length,
      steps: ONBOARDING_STEPS.map((step, index) => ({
        key: step,
        label: getStepLabel(step),
        index: index + 1,
      })),
    };
  },

  // ── Helpers ───────────────────────────────────────────────────

  async getVendorOrThrow(vendorId: string) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new AppError(ErrorCodes.NOT_FOUND, 'Vendor not found', 404);
    return vendor;
  },

  assertOnboardingStepAllowed(currentStep: OnboardingStep, requiredStep: OnboardingStep) {
    const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
    const requiredIndex = ONBOARDING_STEPS.indexOf(requiredStep);

    // Allow re-submission of current or earlier steps (edits), but not skipping
    if (requiredIndex > currentIndex + 1) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Please complete step "${getStepLabel(ONBOARDING_STEPS[currentIndex])}" first`,
        422,
      );
    }
  },

  async updateOnboardingCache(vendorId: string, completedStep: string) {
    const key = onboardingKey(vendorId);
    const existing = await redis.get(key);
    const state = existing ? JSON.parse(existing) : { completedSteps: [] };

    if (!state.completedSteps.includes(completedStep)) {
      state.completedSteps.push(completedStep);
    }

    await redis.setex(key, 86400, JSON.stringify(state));
  },
};

function getStepLabel(step: OnboardingStep): string {
  const labels: Record<OnboardingStep, string> = {
    business_info: 'Business Information',
    documents: 'Verification Documents',
    payout_setup: 'Payout Account',
    store_setup: 'Store Setup',
    shipping_config: 'Shipping Configuration',
    policy_agreement: 'Policy Agreement',
    review: 'Submit for Review',
  };
  return labels[step] ?? step;
}
