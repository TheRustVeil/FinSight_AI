import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { ApiError } from '../../lib/api-error';
import { hashPassword, verifyPassword, generateToken, hashToken } from '../../lib/crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { sendMail, emailVerificationTemplate, passwordResetTemplate } from '../../lib/mailer';
import type { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from './auth.validation';

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await hashPassword(input.password);

  // In development we auto-verify so the app is usable without a running mail
  // server. AUTH_AUTO_VERIFY=true enables the same behavior in production
  // (e.g. a demo deploy without an SMTP provider).
  const autoVerify = env.NODE_ENV === 'development' || env.AUTH_AUTO_VERIFY;

  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      passwordHash,
      emailVerified: autoVerify,
      preferences: { create: {} },
    },
    select: { id: true, email: true, fullName: true },
  });

  // Best-effort verification email — a missing SMTP server must not break signup.
  try {
    await sendVerificationEmail(user.id, user.email, user.fullName);
  } catch (err) {
    if (!autoVerify) throw err;
    // dev without a mail server: account is already auto-verified above, safe to ignore.
  }

  return {
    message: autoVerify
      ? 'Account created. You can now log in.'
      : 'Account created. Please check your email to verify your account.',
  };
}

export async function sendVerificationEmail(userId: string, email: string, name: string) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerification.deleteMany({ where: { userId } });
  await prisma.emailVerification.create({ data: { userId, tokenHash, expiresAt } });

  const url = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendMail({ to: email, subject: 'Verify your FinSight AI account', html: emailVerificationTemplate(name, url) });
}

export async function verifyEmail(token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.emailVerification.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest('Invalid or expired verification link');
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    prisma.emailVerification.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { message: 'Email verified successfully' };
}

export async function login(input: LoginInput, deviceInfo?: object) {
  const user = await prisma.user.findUnique({
    where: { email: input.email, deletedAt: null },
    select: {
      id: true, email: true, fullName: true, passwordHash: true,
      emailVerified: true, role: true, plan: true, avatarUrl: true,
    },
  });

  if (!user || !user.passwordHash) throw ApiError.unauthorized('Invalid email or password');
  if (!user.emailVerified) throw ApiError.unauthorized('Please verify your email before logging in');

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  const { accessToken, refreshToken } = await issueTokenPair(
    user.id,
    { email: user.email, role: user.role },
    deviceInfo,
  );

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, fullName: user.fullName, avatarUrl: user.avatarUrl, role: user.role, plan: user.plan },
  };
}

export async function refreshSession(rawRefreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token expired or revoked');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub, deletedAt: null },
    select: { id: true, email: true, role: true, plan: true },
  });
  if (!user) throw ApiError.unauthorized('User not found');

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  const { accessToken, refreshToken } = await issueTokenPair(user.id, { email: user.email, role: user.role });

  return { accessToken, refreshToken };
}

export async function logout(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revokedAt: new Date() } });
}

export async function forgotPassword(input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email, deletedAt: null } });
  // Always return same message to prevent email enumeration
  if (!user) return { message: 'If that email is registered, you will receive a reset link.' };

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
  await prisma.passwordReset.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const url = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendMail({ to: user.email, subject: 'Reset your FinSight AI password', html: passwordResetTemplate(user.fullName, url) });

  return { message: 'If that email is registered, you will receive a reset link.' };
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = hashToken(input.token);
  const record = await prisma.passwordReset.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest('Invalid or expired reset link');
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Invalidate all sessions on password change
    prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revokedAt: new Date() } }),
  ]);

  return { message: 'Password reset successfully. Please log in with your new password.' };
}

export async function handleGoogleOAuth(profile: {
  id: string; email: string; name: string; picture?: string;
}) {
  let user = await prisma.user.findUnique({ where: { email: profile.email, deletedAt: null } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        fullName: profile.name,
        avatarUrl: profile.picture,
        emailVerified: true,
        preferences: { create: {} },
      },
    });
  }

  await prisma.oAuthAccount.upsert({
    where: { provider_providerId: { provider: 'google', providerId: profile.id } },
    update: {},
    create: { userId: user.id, provider: 'google', providerId: profile.id },
  });

  const { accessToken, refreshToken } = await issueTokenPair(user.id, { email: user.email, role: user.role });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, fullName: user.fullName, avatarUrl: user.avatarUrl, role: user.role, plan: user.plan },
  };
}

async function issueTokenPair(userId: string, meta: { email: string; role: string }, deviceInfo?: object) {
  const rawRefreshToken = signRefreshToken(userId);
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt, deviceInfo: deviceInfo as never },
  });

  const accessToken = signAccessToken({ sub: userId, email: meta.email, role: meta.role });

  return { accessToken, refreshToken: rawRefreshToken };
}
