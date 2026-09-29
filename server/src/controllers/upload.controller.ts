import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileTypeFromFile } from 'file-type';
import sharp from 'sharp';
import { z } from 'zod';
import { Post } from '../models/Post.js';
import { referencesUpload } from '../mediaReferences.js';
import { config } from '../config/env.js';
import { createError, asyncHandler } from '../middlewares/error.middleware.js';
const types: Record<string, {extensions: string[]; mime: string; kind: string}> = {
  jpg: {extensions: ['.jpg', '.jpeg'], mime: 'image/jpeg', kind: 'image'},
  png: {extensions: ['.png'], mime: 'image/png', kind: 'image'},
  gif: {extensions: ['.gif'], mime: 'image/gif', kind: 'image'},
  webp: {extensions: ['.webp'], mime: 'image/webp', kind: 'image'},
  mp4: {extensions: ['.mp4'], mime: 'video/mp4', kind: 'video'},
  mov: {extensions: ['.mov'], mime: 'video/quicktime', kind: 'video'},
  webm: {extensions: ['.webm'], mime: 'video/webm', kind: 'video'},
  pdf: {extensions: ['.pdf'], mime: 'application/pdf', kind: 'file'},
};
const extension = (name: string) => path.extname(name).slice(1).toLowerCase().replace('jpeg', 'jpg');
const validFilename = (name: string) => Buffer.byteLength(name) <= 255 && !/[\u0000-\u001f\u007f-\u009f]/u.test(name) && name === path.basename(name) && !name.startsWith('.') && !name.includes('\\') && !!types[extension(name)];
// Serialize the quota check + final file write for this single-writer app.
let writes: Promise<unknown> = Promise.resolve();
function locked<T>(operation: () => Promise<T>): Promise<T> {
  const next = writes.then(operation, operation); writes = next.catch(() => undefined); return next;
}
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw createError('파일을 선택해주세요', 400);
  const file = req.file;
  try {
    const detected = await fileTypeFromFile(file.path);
    const format = detected && types[detected.ext];
    if (!detected || !format || !format.extensions.includes(path.extname(file.originalname).toLowerCase())) throw createError('파일 내용과 확장자를 확인해주세요. SVG/HTML은 허용하지 않습니다.', 400);
    let bytes: Buffer;
    if (format.kind === 'image') {
      try { bytes = await sharp(file.path, {limitInputPixels: 25000000, animated: true}).rotate().toBuffer(); }
      catch { throw createError('올바른 이미지가 아니거나 이미지 크기가 너무 큽니다', 400); }
    } else { bytes = await fs.readFile(file.path); }
    if (bytes.length > config.MAX_FILE_SIZE_MB * 1024 * 1024) throw createError('변환한 파일이 너무 큽니다', 413);
    const filename = randomUUID() + '.' + detected.ext;
    await locked(async () => {
      await fs.mkdir(config.UPLOAD_DIR, {recursive: true});
      const names = await fs.readdir(config.UPLOAD_DIR);
      let total = 0;
      for (const name of names) { const stat = await fs.lstat(path.join(config.UPLOAD_DIR, name)); if (stat.isFile()) total += stat.size; }
      if (total + bytes.length > config.MAX_UPLOAD_TOTAL_MB * 1024 * 1024) throw createError('전체 업로드 용량 한도를 초과했습니다', 413);
      await fs.writeFile(path.join(config.UPLOAD_DIR, filename), bytes, {flag: 'wx', mode: 0o640});
    });
    res.status(201).json({success: true, data: {url: '/uploads/' + filename, filename, mimetype: format.mime, size: bytes.length}});
  } finally { await fs.unlink(file.path).catch(() => undefined); }
});
export const getMediaLibrary = asyncHandler(async (req, res) => {
  const {page} = z.object({page: z.coerce.number().int().min(1).max(100000).default(1)}).strict().parse(req.query);
  const names = await fs.readdir(config.UPLOAD_DIR).catch(() => [] as string[]);
  const data = [];
  for (const filename of names.filter(validFilename)) {
    const stat = await fs.lstat(path.join(config.UPLOAD_DIR, filename));
    if (stat.isFile()) data.push({filename, url: '/uploads/' + filename, size: stat.size, createdAt: stat.birthtime, type: types[extension(filename)].kind});
  }
  data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  res.json({success: true, data: data.slice((page - 1) * 50, page * 50), count: data.length});
});
export const deleteFile = asyncHandler(async (req, res) => {
  const filename = String(req.params.filename);
  if (!validFilename(filename)) throw createError('잘못된 파일명입니다', 400);
  // Include drafts. A cursor bounds memory without skipping encoded references
  // through a raw-text database prefilter. Deletion is an infrequent admin action.
  const posts = Post.find().select('thumbnail media content -_id').lean().cursor({batchSize: 20});
  try {
    for await (const post of posts) {
      if ([post.thumbnail, ...(post.media || []), post.content].some(value => referencesUpload(value, filename))) {
        throw createError('게시글에서 사용 중인 파일입니다. 글에서 첨부를 제거하고 저장한 뒤 삭제해주세요.', 409);
      }
    }
  } finally { await posts.close(); }
  try { await fs.unlink(path.join(config.UPLOAD_DIR, filename)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw createError('파일을 찾을 수 없습니다', 404);
    throw error;
  }
  res.json({success: true, message: '파일이 삭제되었습니다'});
});
export const serveUpload = asyncHandler(async (req, res) => {
  const filename = String(req.params.filename);
  if (!validFilename(filename)) throw createError('파일을 찾을 수 없습니다', 404);
  const file = path.join(config.UPLOAD_DIR, filename);
  const stat = await fs.lstat(file).catch(() => null);
  if (!stat?.isFile()) throw createError('파일을 찾을 수 없습니다', 404);
  const format = types[extension(filename)];
  res.type(format.mime);
  res.set('X-Content-Type-Options', 'nosniff');
  if (format.kind === 'file') { res.set('Content-Security-Policy', "sandbox; default-src 'none'"); res.attachment(filename); }
  res.sendFile(file);
});
