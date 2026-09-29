import { Router } from 'express';
import { login, getMe, logout } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rateLimit.middleware.js';
const router = Router();
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout);
// Administrator creation is CLI-only; no public initialization route exists.
export default router;
