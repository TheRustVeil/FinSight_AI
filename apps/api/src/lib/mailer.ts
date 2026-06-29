import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || 'localhost',
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailOptions): Promise<void> {
  try {
    await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
    logger.info({ to, subject }, 'Email sent');
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to send email');
    throw err;
  }
}

export function emailVerificationTemplate(name: string, url: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h1 style="color:#0f172a;font-size:24px">Welcome to FinSight AI, ${name}!</h1>
      <p style="color:#475569">Please verify your email address to activate your account.</p>
      <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
        Verify Email
      </a>
      <p style="color:#94a3b8;font-size:13px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
    </div>
  `;
}

export function passwordResetTemplate(name: string, url: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h1 style="color:#0f172a;font-size:24px">Reset your password</h1>
      <p style="color:#475569">Hi ${name}, we received a request to reset your FinSight AI password.</p>
      <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
        Reset Password
      </a>
      <p style="color:#94a3b8;font-size:13px">This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>
    </div>
  `;
}
