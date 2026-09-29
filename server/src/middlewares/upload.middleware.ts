import multer from 'multer';
import { tmpdir } from 'node:os';
import { config } from '../config/env.js';
export const upload = multer({dest: tmpdir(), limits: {fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024, files: 1, fields: 0, parts: 2}});
