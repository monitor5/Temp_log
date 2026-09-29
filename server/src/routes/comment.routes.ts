import { Router } from 'express';
import {
  getCommentsByPost,
  createComment,
  deleteComment,
  deleteCommentByAdmin
} from '../controllers/comment.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { commentLimiter, apiLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// 공개 API
router.get('/', apiLimiter, getCommentsByPost);
router.post('/', commentLimiter, createComment);
router.delete('/:id', apiLimiter, deleteComment);

// 관리자 전용 API
router.delete('/:id/admin', authMiddleware, deleteCommentByAdmin);

export default router;

