import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
export interface AppError extends Error { statusCode?: number; isOperational?: boolean; code?: number | string; }
export const createError = (message: string, statusCode = 500): AppError => Object.assign(new Error(message), {statusCode, isOperational: true});
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler => (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next); };
export function errorHandler(err: AppError, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) { next(err); return; }
  let status = err.isOperational ? err.statusCode || 500 : 500;
  let message = err.isOperational ? err.message : '서버 오류가 발생했습니다';
  if (err instanceof ZodError || ['ValidationError', 'CastError'].includes(err.name)) { status = 400; message = '입력값을 확인해주세요'; }
  if (err instanceof multer.MulterError) { status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400; message = '업로드 크기 또는 파일 수 제한을 초과했습니다'; }
  if (err.code === 11000) { status = 409; message = '이미 사용 중인 값입니다'; }
  if (err instanceof SyntaxError && 'body' in err) { status = 400; message = '올바른 JSON을 입력해주세요'; }
  if (status >= 500) console.error('request_failed', {name: err.name});
  res.status(status).json({success: false, error: message});
}
