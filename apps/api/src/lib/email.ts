import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const sesClient = new SESClient({ region: env.AWS_REGION });

interface EmailOptions {
  to: string | string[];
  template: string;
  data: Record<string, unknown>;
  subject?: string;
}

// Email templates — in production these would be loaded from SES templates or a template engine
function renderTemplate(template: string, data: Record<string, unknown>): { subject: string; html: string; text: string } {
  const templates: Record<string, { subject: string; html: (d: Record<string, unknown>) => string }> = {
    'email-verification': {
      subject: 'Verify your email — MarkComm',
      html: (d) => `
        <h1>Welcome to MarkComm!</h1>
        <p>Hi ${d['firstName'] as string},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${d['verificationUrl'] as string}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Verify Email
        </a>
        <p>This link expires in 24 hours.</p>
      `,
    },
    'password-reset': {
      subject: 'Reset your password — MarkComm',
      html: (d) => `
        <h1>Password Reset Request</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${d['resetUrl'] as string}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Reset Password
        </a>
        <p>This link expires in 2 hours. If you did not request this, ignore this email.</p>
      `,
    },
    'order-confirmation': {
      subject: 'Order Confirmed — MarkComm',
      html: (d) => `
        <h1>Order Confirmed!</h1>
        <p>Your order #${d['orderNumber'] as string} has been confirmed.</p>
        <p>Total: ${d['currency'] as string} ${d['total'] as string}</p>
      `,
    },
  };

  const tmpl = templates[template];
  if (!tmpl) {
    throw new Error(`Email template '${template}' not found`);
  }

  return {
    subject: tmpl.subject,
    html: tmpl.html(data),
    text: `Please view this email in an HTML-compatible email client.`,
  };
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const { subject, html, text } = renderTemplate(options.template, options.data);

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: env.SES_FROM_EMAIL,
        Destination: { ToAddresses: recipients },
        Message: {
          Subject: { Data: options.subject ?? subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: html, Charset: 'UTF-8' },
            Text: { Data: text, Charset: 'UTF-8' },
          },
        },
      }),
    );
    logger.info({ to: recipients, template: options.template }, 'Email sent');
  } catch (error) {
    logger.error({ error, to: recipients, template: options.template }, 'Failed to send email');
    throw error;
  }
}
