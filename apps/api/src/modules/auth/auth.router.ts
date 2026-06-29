import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import * as controller from './auth.controller';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation';
import { z } from 'zod';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), controller.register);
authRouter.post('/login', validate(loginSchema), controller.login);
authRouter.post('/logout', controller.logout);
authRouter.post('/refresh', controller.refresh);
authRouter.post('/verify-email', validate(verifyEmailSchema), controller.verifyEmail);
authRouter.post('/resend-verification', validate(z.object({ email: z.string().email() })), controller.resendVerification);
authRouter.post('/forgot-password', validate(forgotPasswordSchema), controller.forgotPassword);
authRouter.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);
authRouter.get('/me', authenticate, controller.me);
