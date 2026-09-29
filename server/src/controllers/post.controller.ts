import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Post } from '../models/Post.js';
import { postCreate, postUpdate, postQuery } from '../validation.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { Comment } from '../models/Comment.js';
import { createError, asyncHandler } from '../middlewares/error.middleware.js';

interface PostQuery {
  type?: 'project' | 'essay';
  isHidden?: boolean;
  tags?: { $in: string[] };
  $text?: { $search: string };
}

// GET /api/posts
export const getPosts = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const {type, page: pageNum, limit: limitNum, sort, order, query, tags, includeHidden} = postQuery.parse(req.query);
  if (includeHidden === 'true' && !(req as AuthRequest).adminId) throw createError('관리자 로그인이 필요합니다', 401);
  const skip = (pageNum - 1) * limitNum;

  const filter: PostQuery = {};
  
  // 숨김 게시글 필터
  if (includeHidden !== 'true') {
    filter.isHidden = false;
  }

  // 타입 필터
  if (type && (type === 'project' || type === 'essay')) {
    filter.type = type;
  }

  // 태그 필터
  if (tags) {
    const tagArray = (tags as string).split(',').map(t => t.trim());
    filter.tags = { $in: tagArray };
  }

  // 텍스트 검색
  if (query) {
    filter.$text = { $search: query as string };
  }

  // 정렬 옵션
  const sortOption: Record<string, 1 | -1> = {};
  sortOption[sort as string] = order === 'asc' ? 1 : -1;
  // Stable tie-breaker keeps equally ranked posts from moving between pages.
  sortOption._id = order === 'asc' ? 1 : -1;

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .select('-content')
      .lean(),
    Post.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: posts,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  });
});

// GET /api/posts/featured
export const getFeaturedPosts = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
  const posts = await Post.find({ isFeatured: true, isHidden: false })
    .sort({ featuredOrder: 1, createdAt: -1 })
    .limit(5)
    .select('-content')
    .lean();

  res.json({
    success: true,
    data: posts
  });
});

// GET /api/posts/:idOrSlug
export const getPostByIdOrSlug = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const idOrSlug = String(req.params.idOrSlug);
  
  let post;
  
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    post = await Post.findById(idOrSlug).lean();
  } else {
    post = await Post.findOne({ slug: idOrSlug }).lean();
  }

  if (!post || (post.isHidden && !(req as AuthRequest).adminId)) {
    throw createError('게시글을 찾을 수 없습니다', 404);
  }

  res.json({
    success: true,
    data: post
  });
});

// POST /api/posts
export const createPost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { type, title, slug, content, tags, thumbnail, media, isHidden, isFeatured, featuredOrder } = postCreate.parse(req.body);

  if (!title || !content) {
    throw createError('제목과 콘텐츠는 필수입니다', 400);
  }

  const post = await Post.create({
    type: type || 'project',
    title,
    slug,
    content,
    tags: tags || [],
    thumbnail,
    media: media || [],
    isHidden,
    isFeatured: isFeatured || false,
    featuredOrder: featuredOrder || 0
  });

  res.status(201).json({
    success: true,
    data: post
  });
});

// PATCH /api/posts/:id
export const updatePost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const id = String(req.params.id);
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('유효하지 않은 ID입니다', 400);
  }

  const updates = postUpdate.parse(req.body);
  if (Object.keys(updates).length === 0) throw createError('수정할 항목이 없습니다', 400);

  const post = await Post.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!post) {
    throw createError('게시글을 찾을 수 없습니다', 404);
  }

  res.json({
    success: true,
    data: post
  });
});

// DELETE /api/posts/:id
export const deletePost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const id = String(req.params.id);
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('유효하지 않은 ID입니다', 400);
  }

  const post = await Post.findByIdAndDelete(id);

  if (!post) {
    throw createError('게시글을 찾을 수 없습니다', 404);
  }

  // 관련 댓글도 삭제
  await Comment.deleteMany({ postId: id });

  res.json({
    success: true,
    message: '게시글이 삭제되었습니다'
  });
});

