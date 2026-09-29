import express, { type RequestHandler } from 'express';
import { config } from '../config/env.js';
import { createError } from './error.middleware.js';

// A custom header prevents simple cross-site form requests, including login CSRF.
export const sameOriginMutation: RequestHandler = (req, _res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (req.get('Origin') !== config.ORIGIN || req.get('X-Requested-With') !== 'TempLog')) {
    next(createError('허용되지 않은 요청 출처입니다', 403));
    return;
  }
  next();
};

// Keep room for 200,000 Unicode characters plus JSON escaping and media URLs.
export const jsonBodyParser = express.json({limit: '2mb'});
