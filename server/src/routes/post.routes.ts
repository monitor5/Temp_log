import { Router } from 'express';
import {
  getPosts,
  getPostByIdOrSlug,
  createPost,
  updatePost,
  deletePost,
  getFeaturedPosts
} from '../controllers/post.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { apiLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// 공개 API
router.get('/', apiLimiter, getPosts);
router.get('/featured', apiLimiter, getFeaturedPosts);
router.get('/:idOrSlug', apiLimiter, getPostByIdOrSlug);

// 관리자 전용 API
router.post('/', authMiddleware, createPost);
router.patch('/:id', authMiddleware, updatePost);
router.delete('/:id', authMiddleware, deletePost);

export default router;

