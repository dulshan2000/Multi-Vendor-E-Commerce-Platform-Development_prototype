import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

// ── Transporter ────────────────────────────────────────────────

const transporter = nodemailer.createTransport(
  env.NODE_ENV === 'production'
    ? {
        // Amazon SES SMTP
        host: 'email-smtp.ap-southeast-1.amazonaws.com',
        port: 587,
        secure: false,
        auth: {
          user: env.AWS_SES_SMTP_USER,
          pass: env.AWS_SES_SMTP_PASS,
        },
      }
    : {
        // MailHog for local dev
        host: 'localhost',
        port: 1025,
        secure: false,
        ignoreTLS: true,
      },
);

const FROM = `MarkComm <${env.SES_FROM_EMAIL}>`;

// ── Email helpers ──────────────────────────────────────────────

function lkr(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function baseTemplate(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrap { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 32px 24px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px; }
    .body { padding: 32px 24px; }
    .btn { display: inline-block; padding: 12px 28px; background: #7c3aed; color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .footer { background: #f9f9fb; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .item-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .total-row { display: flex; justify-content: space-between; padding: 12px 0 0; font-weight: 700; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px 4px; font-size: 14px; }
    .flag { font-size: 20px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>MarkComm 🛍️</h1>
      <p>Sri Lanka&apos;s Multi-Vendor Marketplace</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      <p>MarkComm — Your trusted marketplace 🇱🇰</p>
      <p>Need help? Email <a href="mailto:support@markcomm.lk">support@markcomm.lk</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ── Email service ──────────────────────────────────────────────

export const emailService = {
  async sendEmailVerification(to: string, verificationUrl: string) {
    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'Verify your MarkComm account',
      html: baseTemplate('Verify Your Account', `
        <h2 style="color:#111827;margin-top:0">Verify your email</h2>
        <p style="color:#4b5563">Click the button below to verify your email address and activate your MarkComm account.</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${verificationUrl}" class="btn">Verify Email</a>
        </p>
        <p style="color:#9ca3af;font-size:13px">This link expires in 24 hours. If you didn&apos;t create an account, you can ignore this email.</p>
      `),
    });
    logger.info({ to }, 'Verification email sent');
  },

  async sendPasswordReset(to: string, resetUrl: string) {
    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'Reset your MarkComm password',
      html: baseTemplate('Password Reset', `
        <h2 style="color:#111827;margin-top:0">Reset your password</h2>
        <p style="color:#4b5563">We received a request to reset the password for your MarkComm account.</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${resetUrl}" class="btn">Reset Password</a>
        </p>
        <p style="color:#9ca3af;font-size:13px">This link expires in 2 hours. If you didn&apos;t request a reset, please ignore this email.</p>
      `),
    });
    logger.info({ to }, 'Password reset email sent');
  },

  async sendOrderConfirmation(params: {
    to: string;
    orderNumber: string;
    total: number;
    currency: 'LKR';
    items: { title: string; quantity: number; unitPrice: number }[];
  }) {
    const itemRows = params.items.map((i) => `
      <tr>
        <td>${i.title}</td>
        <td style="text-align:center">${i.quantity}</td>
        <td style="text-align:right">${lkr(i.unitPrice)}</td>
        <td style="text-align:right">${lkr(i.unitPrice * i.quantity)}</td>
      </tr>
    `).join('');

    await transporter.sendMail({
      from: FROM,
      to: params.to,
      subject: `Order confirmed — #${params.orderNumber}`,
      html: baseTemplate('Order Confirmed!', `
        <h2 style="color:#111827;margin-top:0">🎉 Your order is confirmed!</h2>
        <p style="color:#4b5563">Thank you for shopping with MarkComm. Your order <strong>#${params.orderNumber}</strong> has been received and is being processed.</p>

        <table style="margin-top:20px">
          <thead>
            <tr style="background:#f9fafb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">
              <td>Product</td>
              <td style="text-align:center">Qty</td>
              <td style="text-align:right">Price</td>
              <td style="text-align:right">Total</td>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;padding-top:12px;font-weight:700">Total</td>
              <td style="text-align:right;padding-top:12px;font-weight:700;font-size:16px;color:#7c3aed">${lkr(params.total)}</td>
            </tr>
          </tfoot>
        </table>

        <p style="color:#4b5563;margin-top:24px">You&apos;ll receive another email when your order ships with tracking information.</p>
        <p style="text-align:center;margin:24px 0">
          <a href="${env.APP_URL}/orders" class="btn">Track Your Order</a>
        </p>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-top:24px">
          <p style="margin:0;font-size:14px;color:#15803d">
            🚚 Delivered island-wide by Domex, PickMe Delivery & Lanka Post EMS.<br/>
            💳 Paid securely via PayHere — your purchase is protected.
          </p>
        </div>
      `),
    });
    logger.info({ to: params.to, orderNumber: params.orderNumber }, 'Order confirmation email sent');
  },

  async sendVendorOrderNotification(params: {
    to: string;
    vendorName: string;
    orderNumber: string;
    itemCount: number;
    total: number;
  }) {
    await transporter.sendMail({
      from: FROM,
      to: params.to,
      subject: `New order received — #${params.orderNumber}`,
      html: baseTemplate('New Order!', `
        <h2 style="color:#111827;margin-top:0">📦 You have a new order!</h2>
        <p style="color:#4b5563">Hi <strong>${params.vendorName}</strong>, a customer has placed an order from your store.</p>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:20px 0">
          <p style="margin:0;font-size:15px"><strong>Order #:</strong> ${params.orderNumber}</p>
          <p style="margin:4px 0;font-size:15px"><strong>Items:</strong> ${params.itemCount}</p>
          <p style="margin:4px 0;font-size:15px"><strong>Value:</strong> ${lkr(params.total)}</p>
        </div>
        <p style="text-align:center;margin:24px 0">
          <a href="${env.APP_URL}/vendor/orders" class="btn">View Order</a>
        </p>
        <p style="color:#9ca3af;font-size:13px">Please process this order within 24 hours to maintain your store rating.</p>
      `),
    });
  },

  async sendVendorApproval(to: string, vendorName: string) {
    await transporter.sendMail({
      from: FROM,
      to,
      subject: '🎉 Your MarkComm vendor account is approved!',
      html: baseTemplate('Vendor Approved!', `
        <h2 style="color:#111827;margin-top:0">Welcome to MarkComm, ${vendorName}! 🎉</h2>
        <p style="color:#4b5563">Your vendor application has been reviewed and approved. You can now start listing products and receiving orders.</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${env.APP_URL}/vendor/dashboard" class="btn">Go to Dashboard</a>
        </p>
        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-top:20px">
          <p style="margin:0;font-size:14px;color:#92400e">
            💡 Complete your store setup and add your first products to start selling!
          </p>
        </div>
      `),
    });
  },

  async sendVendorRejection(to: string, vendorName: string, reason: string) {
    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'MarkComm vendor application update',
      html: baseTemplate('Application Update', `
        <h2 style="color:#111827;margin-top:0">Application Status Update</h2>
        <p style="color:#4b5563">Hi ${vendorName}, thank you for applying to sell on MarkComm.</p>
        <p style="color:#4b5563">Unfortunately, we were unable to approve your application at this time.</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0">
          <p style="margin:0;font-size:14px;color:#dc2626"><strong>Reason:</strong> ${reason}</p>
        </div>
        <p style="color:#4b5563">You may re-apply after addressing the above concerns. If you have questions, please contact <a href="mailto:support@markcomm.lk">support@markcomm.lk</a>.</p>
      `),
    });
  },
};
