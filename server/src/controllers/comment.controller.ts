import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Comment } from '../models/Comment.js';
import { Post } from '../models/Post.js';
import { config } from '../config/env.js';
import { createError, asyncHandler } from '../middlewares/error.middleware.js';

// GET /api/comments?postId=
export const getCommentsByPost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { postId, page, limit } = z.object({
    postId: z.string().regex(/^[a-f0-9]{24}$/i),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).strict().parse(req.query);

  if (!postId || !mongoose.Types.ObjectId.isValid(postId as string)) {
    throw createError('유효한 게시글 ID가 필요합니다', 400);
  }

  if (!(await Post.exists({_id: postId, isHidden: false}))) throw createError('게시글을 찾을 수 없습니다', 404);

  const [comments, total] = await Promise.all([
    Comment.find({ postId })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-passwordHash')
      .lean(),
    Comment.countDocuments({ postId }),
  ]);

  res.json({
    success: true,
    data: comments,
    count: total,
    pagination: {page, limit, total, totalPages: Math.ceil(total / limit)},
  });
});

// POST /api/comments
export const createComment = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { postId, author, password, content } = z.object({postId: z.string().regex(/^[a-f0-9]{24}$/i), author: z.string().trim().min(1).max(50), password: z.string().min(8).max(72).refine(p => Buffer.byteLength(p) <= 72), content: z.string().trim().min(1).max(1000)}).parse(req.body);

  if (!postId || !author || !password || !content) {
    throw createError('게시글 ID, 작성자, 비밀번호, 내용은 필수입니다', 400);
  }

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw createError('유효하지 않은 게시글 ID입니다', 400);
  }

  // 게시글 존재 확인
  const post = await Post.findById(postId);
  if (!post || post.isHidden) {
    throw createError('게시글을 찾을 수 없습니다', 404);
  }

  if (password.length < 4) {
    throw createError('비밀번호는 4자 이상이어야 합니다', 400);
  }

  const passwordHash = await bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);

  const comment = await Comment.create({
    postId,
    author: author.trim(),
    passwordHash,
    content: content.trim()
  });

  res.status(201).json({
    success: true,
    data: {
      _id: comment._id,
      postId: comment.postId,
      author: comment.author,
      content: comment.content,
      createdAt: comment.createdAt
    }
  });
});

// DELETE /api/comments/:id (비밀번호 검증)
export const deleteComment = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const id = String(req.params.id);
  const { password } = z.object({password: z.string().min(1).max(72).refine(p => Buffer.byteLength(p) <= 72)}).parse(req.body);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('유효하지 않은 댓글 ID입니다', 400);
  }

  if (!password) {
    throw createError('비밀번호를 입력해주세요', 400);
  }

  const comment = await Comment.findById(id);

  if (!comment) {
    throw createError('댓글을 찾을 수 없습니다', 404);
  }

  const isMatch = await bcrypt.compare(password, comment.passwordHash);

  if (!isMatch) {
    throw createError('비밀번호가 일치하지 않습니다', 401);
  }

  await Comment.findByIdAndDelete(id);

  res.json({
    success: true,
    message: '댓글이 삭제되었습니다'
  });
});

// DELETE /api/comments/:id/admin (관리자 권한)
export const deleteCommentByAdmin = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const id = String(req.params.id);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('유효하지 않은 댓글 ID입니다', 400);
  }

  const comment = await Comment.findByIdAndDelete(id);

  if (!comment) {
    throw createError('댓글을 찾을 수 없습니다', 404);
  }

  res.json({
    success: true,
    message: '댓글이 삭제되었습니다'
  });
});
