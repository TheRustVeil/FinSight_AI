import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { env } from '../../config/env';

const COOKIE_NAME = 'refresh_token';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const deviceInfo = { userAgent: req.headers['user-agent'], ip: req.ip };
    const result = await authService.login(req.body, deviceInfo);
    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No refresh token' } });

    const result = await authService.refreshSession(token);
    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
    res.json({ accessToken: result.accessToken });
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) await authService.logout(token);
    res.clearCookie(COOKIE_NAME, { path: '/api/v1/auth' });
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.verifyEmail(req.body.token);
    res.json(result);
  } catch (err) { next(err); }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const user = await import('../../config/database').then(m =>
      m.prisma.user.findUnique({ where: { email }, select: { id: true, email: true, fullName: true, emailVerified: true } })
    );
    if (user && !user.emailVerified) {
      await authService.sendVerificationEmail(user.id, user.email, user.fullName);
    }
    res.json({ message: 'If your email is registered and unverified, you will receive a new link.' });
  } catch (err) { next(err); }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.forgotPassword(req.body);
    res.json(result);
  } catch (err) { next(err); }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.resetPassword(req.body);
    res.json(result);
  } catch (err) { next(err); }
}

export async function googleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = req.body as { id: string; email: string; name: string; picture?: string };
    const result = await authService.handleGoogleOAuth(profile);
    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
    res.redirect(`${env.FRONTEND_URL}/dashboard?token=${result.accessToken}`);
  } catch (err) { next(err); }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await import('../../config/database').then(m =>
      m.prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, email: true, fullName: true, avatarUrl: true, role: true, plan: true, currency: true, timezone: true, createdAt: true },
      })
    );
    res.json({ user });
  } catch (err) { next(err); }
}
