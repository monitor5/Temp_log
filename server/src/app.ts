import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import mongoose from 'mongoose';
import path from 'node:path';
import { config } from './config/env.js';
import { optionalAuth } from './middlewares/auth.middleware.js';
import { errorHandler, createError } from './middlewares/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import postRoutes from './routes/post.routes.js';
import commentRoutes from './routes/comment.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import { serveUpload } from './controllers/upload.controller.js';
export const sessionStore = MongoStore.create({mongoUrl: config.MONGO_URI, collectionName: 'sessions', mongoOptions: {serverSelectionTimeoutMS: 5000, socketTimeoutMS: 10000, maxPoolSize: 5}, ttl: 12 * 60 * 60});
export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.TRUST_PROXY_HOPS);
app.use(helmet({contentSecurityPolicy: {directives: {
  'default-src': ["'self'"], 'script-src': ["'self'"], 'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'https:', 'data:'], 'font-src': ["'self'"],
  'media-src': ["'self'", 'https:'], 'frame-src': ['https://www.youtube-nocookie.com', 'https://player.vimeo.com'],
  'connect-src': ["'self'"], 'upgrade-insecure-requests': config.SECURE_COOKIE ? [] : null,
}}, strictTransportSecurity: config.SECURE_COOKIE ? undefined : false}));
app.get('/health/live', (_req, res) => { res.json({status: 'ok'}); });
app.get(['/health/ready', '/api/health'], async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) throw new Error('Unavailable');
    await mongoose.connection.db.admin().ping({maxTimeMS: 2000});
    res.json({status: 'ok'});
  } catch { res.status(503).json({status: 'unavailable'}); }
});
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
app.use('/api', (req, _res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && (req.get('Origin') !== config.ORIGIN || req.get('X-Requested-With') !== 'TempLog')) {
    next(createError('허용되지 않은 요청 출처입니다', 403)); return;
  }
  next();
});
app.use(express.json({limit: '256kb'}));
app.use('/api', session({name: 'temp_log.sid', secret: config.SESSION_SECRET, store: sessionStore, resave: false, saveUninitialized: false,
  cookie: {httpOnly: true, secure: config.SECURE_COOKIE, sameSite: 'strict', maxAge: 12 * 60 * 60 * 1000, path: '/'}}));
app.use('/api', optionalAuth);
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', (_req, _res, next) => next(createError('API를 찾을 수 없습니다', 404)));
app.get('/uploads/:filename', serveUpload);
app.use(express.static(config.CLIENT_DIR, {index: false, dotfiles: 'deny'}));
app.get('/{*path}', (_req, res, next) => { res.sendFile(path.join(config.CLIENT_DIR, 'index.html'), error => { if (error) next(createError('페이지를 찾을 수 없습니다', 404)); }); });
app.use(errorHandler);
