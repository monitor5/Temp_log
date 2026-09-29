import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

const env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  MONGO_URI: z.string().startsWith('mongodb').default('mongodb://127.0.0.1:27017/archlog'),
  SESSION_SECRET: z.string().min(48),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).max(100).default(25),
  MAX_UPLOAD_TOTAL_MB: z.coerce.number().int().min(25).max(100000).default(1024),
}).parse(process.env);
const url = new URL(env.PUBLIC_URL);
if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
  throw new Error('PUBLIC_URL must be an origin without credentials, path, query or fragment');
}
if (env.NODE_ENV === 'production' && url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  throw new Error('Production PUBLIC_URL must use HTTPS except for localhost');
}
export const config = {
  ...env,
  ORIGIN: url.origin,
  SECURE_COOKIE: url.protocol === 'https:',
  UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  CLIENT_DIR: path.resolve(process.env.CLIENT_DIR || '../client/dist'),
  BCRYPT_SALT_ROUNDS: 12,
};
