import { z } from 'zod';
export const mediaUrl = z.string().max(2048).refine(value => value === '' || (!value.includes('..') && /^\/uploads\/[^?#\\]+$/.test(value)) || (() => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } })(), 'Invalid media URL');
export const postInput = z.object({
  type: z.enum(['project', 'essay']), title: z.string().trim().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9가-힣-]+$/).max(160)
    .refine(value => value !== 'featured' && !/^[a-f0-9]{24}$/.test(value), 'Slug conflicts with an API route or post ID').optional(),
  content: z.string().min(1).max(200000).refine(value => value.trim().length > 0, 'Content must not be blank'), tags: z.array(z.string().trim().min(1).max(50)).max(20),
  thumbnail: mediaUrl.optional(), media: z.array(mediaUrl).max(50).optional(),
  isHidden: z.boolean(), isFeatured: z.boolean(), featuredOrder: z.number().int().min(0).max(1000).optional(),
}).strict();
export const postCreate = postInput.extend({type: postInput.shape.type.default('project'), tags: postInput.shape.tags.default([]), isHidden: postInput.shape.isHidden.default(true), isFeatured: postInput.shape.isFeatured.default(false)});
export const postUpdate = postInput.partial();
export const postQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(50).default(12),
  type: z.enum(['project', 'essay']).optional(), sort: z.enum(['createdAt', 'updatedAt', 'title', 'featuredOrder']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'), query: z.string().max(200).optional(), tags: z.string().max(1000).optional(),
  includeHidden: z.enum(['true', 'false']).default('false'),
}).strict();
