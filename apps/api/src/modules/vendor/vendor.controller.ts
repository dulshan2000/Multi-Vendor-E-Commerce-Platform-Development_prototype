import type { FastifyRequest, FastifyReply } from 'fastify';
import { vendorService } from './vendor.service.js';
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

export const vendorController = {
  // ── Registration ─────────────────────────────────────────────

  register: async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user!;
    const vendor = await vendorService.register(userId);
    return reply.status(201).send({ data: vendor, meta: null, error: null });
  },

  // ── Onboarding progress ───────────────────────────────────────

  getOnboardingProgress: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const progress = await vendorService.getOnboardingProgress(request.params.id);
    return reply.send({ data: progress, meta: null, error: null });
  },

  // ── Onboarding steps ──────────────────────────────────────────

  saveBusinessInfo: async (
    request: FastifyRequest<{ Params: { id: string }; Body: Step1BusinessInput }>,
    reply: FastifyReply,
  ) => {
    const result = await vendorService.saveBusinessInfo(request.params.id, request.body);
    return reply.send({ data: result, meta: null, error: null });
  },

  saveDocuments: async (
    request: FastifyRequest<{ Params: { id: string }; Body: Step2DocumentInput }>,
    reply: FastifyReply,
  ) => {
    const result = await vendorService.saveDocuments(request.params.id, request.body);
    return reply.send({ data: result, meta: null, error: null });
  },

  savePayoutAccount: async (
    request: FastifyRequest<{ Params: { id: string }; Body: Step3PayoutInput }>,
    reply: FastifyReply,
  ) => {
    const result = await vendorService.savePayoutAccount(request.params.id, request.body);
    return reply.send({ data: result, meta: null, error: null });
  },

  saveStoreSetup: async (
    request: FastifyRequest<{ Params: { id: string }; Body: Step4StoreSetupInput }>,
    reply: FastifyReply,
  ) => {
    const result = await vendorService.saveStoreSetup(request.params.id, request.body);
    return reply.send({ data: result, meta: null, error: null });
  },

  saveShippingConfig: async (
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
    reply: FastifyReply,
  ) => {
    const result = await vendorService.saveShippingConfig(request.params.id, request.body as Parameters<typeof vendorService.saveShippingConfig>[1]);
    return reply.send({ data: result, meta: null, error: null });
  },

  acceptPolicies: async (
    request: FastifyRequest<{ Params: { id: string }; Body: { acceptedTerms: true; acceptedCommissionPolicy: true; acceptedSLA: true } }>,
    reply: FastifyReply,
  ) => {
    const result = await vendorService.acceptPolicies(request.params.id, request.body);
    return reply.send({ data: result, meta: null, error: null });
  },

  submitForReview: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const result = await vendorService.submitForReview(request.params.id);
    return reply.send({ data: result, meta: null, error: null });
  },

  // ── Admin actions ─────────────────────────────────────────────

  approveVendor: async (
    request: FastifyRequest<{ Params: { id: string }; Body: ApproveVendorInput }>,
    reply: FastifyReply,
  ) => {
    const result = await vendorService.approveVendor(request.params.id, request.user!.userId, request.body);
    return reply.send({ data: result, meta: null, error: null });
  },

  rejectVendor: async (
    request: FastifyRequest<{ Params: { id: string }; Body: RejectVendorInput }>,
    reply: FastifyReply,
  ) => {
    const result = await vendorService.rejectVendor(request.params.id, request.user!.userId, request.body);
    return reply.send({ data: result, meta: null, error: null });
  },

  suspendVendor: async (
    request: FastifyRequest<{ Params: { id: string }; Body: SuspendVendorInput }>,
    reply: FastifyReply,
  ) => {
    const result = await vendorService.suspendVendor(request.params.id, request.user!.userId, request.body);
    return reply.send({ data: result, meta: null, error: null });
  },

  reinstateVendor: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const result = await vendorService.reinstateVendor(request.params.id, request.user!.userId);
    return reply.send({ data: result, meta: null, error: null });
  },

  // ── Vendor profile ────────────────────────────────────────────

  getVendorProfile: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const vendor = await vendorService.getVendorProfile(request.params.id);
    return reply.send({ data: vendor, meta: null, error: null });
  },

  listVendors: async (
    request: FastifyRequest<{ Querystring: { status?: string; search?: string; page?: number; limit?: number } }>,
    reply: FastifyReply,
  ) => {
    const { status, search, page = 1, limit = 20 } = request.query;
    const result = await vendorService.listVendors({ status: status as Parameters<typeof vendorService.listVendors>[0]['status'], search, page, limit });
    return reply.send({ data: result.vendors, meta: result.meta, error: null });
  },

  // ── Upload URL ────────────────────────────────────────────────

  getUploadUrl: async (
    request: FastifyRequest<{ Params: { id: string }; Body: UploadUrlInput }>,
    reply: FastifyReply,
  ) => {
    const result = await vendorService.getUploadUrl(request.params.id, request.body);
    return reply.send({ data: result, meta: null, error: null });
  },

  // ── Staff ─────────────────────────────────────────────────────

  inviteStaff: async (
    request: FastifyRequest<{ Params: { id: string }; Body: InviteStaffInput }>,
    reply: FastifyReply,
  ) => {
    const result = await vendorService.inviteStaff(request.params.id, request.user!.userId, request.body);
    return reply.status(201).send({ data: result, meta: null, error: null });
  },
};
