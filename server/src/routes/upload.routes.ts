import { Router } from 'express';
import { uploadFile, getMediaLibrary, deleteFile } from '../controllers/upload.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { uploadLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// 파일 업로드 (관리자 전용)
router.post('/', authMiddleware, uploadLimiter, upload.single('file'), uploadFile);

// 미디어 라이브러리 조회 (관리자 전용)
router.get('/library', authMiddleware, getMediaLibrary);

// 파일 삭제 (관리자 전용)
router.delete('/:filename', authMiddleware, deleteFile);

export default router;

