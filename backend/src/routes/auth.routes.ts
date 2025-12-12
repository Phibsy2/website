import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema, refreshTokenSchema } from '../middleware/validation.js';
import { authRateLimiter } from '../middleware/security.js';

const router = Router();

// Öffentliche Routen mit Rate Limiting
router.post('/register', authRateLimiter, validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

// Geschützte Routen
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, authController.changePassword);

export default router;
