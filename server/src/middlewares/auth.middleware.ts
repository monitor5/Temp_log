import type { Request, RequestHandler } from 'express';
import { Admin } from '../models/Admin.js';
import { asyncHandler, createError } from './error.middleware.js';
declare module 'express-session' { interface SessionData { adminId: string; } }
export interface AuthRequest extends Request { adminId?: string; }
export const optionalAuth: RequestHandler = asyncHandler(async (req: AuthRequest, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.session.adminId) {
    const admin = await Admin.findById(req.session.adminId).select('_id').lean();
    if (admin) req.adminId = String(admin._id);
  }
  next();
});
export const authMiddleware: RequestHandler = (req: AuthRequest, _res, next) => {
  if (!req.adminId) { next(createError('관리자 로그인이 필요합니다', 401)); return; }
  next();
};
