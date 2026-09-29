import { z } from 'zod';
import { Admin } from '../models/Admin.js';
import { asyncHandler, createError } from '../middlewares/error.middleware.js';
import { config } from '../config/env.js';
export const login = asyncHandler(async (req, res) => {
  const {username, password} = z.object({username: z.string().trim().min(1).max(50), password: z.string().min(1).max(72).refine(p => Buffer.byteLength(p) <= 72)}).parse(req.body);
  const admin = await Admin.findOne({username: username.toLowerCase()});
  if (!admin || !(await admin.comparePassword(password))) throw createError('잘못된 자격 증명입니다', 401);
  await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  req.session.adminId = String(admin._id);
  await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
  res.json({success: true, admin: {id: admin._id, username: admin.username}});
});
export const getMe = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.session.adminId).select('username');
  if (!admin) throw createError('로그인이 필요합니다', 401);
  res.json({success: true, admin: {id: admin._id, username: admin.username}});
});
export const logout = asyncHandler(async (req, res) => {
  await new Promise<void>((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
  res.clearCookie('temp_log.sid', {httpOnly: true, sameSite: 'strict', secure: config.SECURE_COOKIE, path: '/'});
  res.json({success: true});
});
