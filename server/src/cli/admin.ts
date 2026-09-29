import { Admin } from '../models/Admin.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../config/env.js';
// Read credentials from stdin, never argv, shell history or log output.
let input = '';
for await (const chunk of process.stdin) { input += chunk; if (input.length > 4096) throw new Error('Input too large'); }
try {
  const data = z.object({username: z.string().regex(/^[a-zA-Z0-9_-]{3,50}$/), password: z.string().min(14).max(72)}).parse(JSON.parse(input));
  if (Buffer.byteLength(data.password) > 72) throw new Error('Password must not exceed 72 UTF-8 bytes');
  await mongoose.connect(config.MONGO_URI);
  await Admin.init();
  const passwordHash = await bcrypt.hash(data.password, config.BCRYPT_SALT_ROUNDS);
  if (process.argv.includes('--reset-password')) {
    const admin = await Admin.findOneAndUpdate({username: data.username.toLowerCase()}, {$set: {passwordHash}});
    if (!admin) throw new Error('Administrator not found');
    await mongoose.connection.collection('sessions').deleteMany({});
    console.log('Password reset; all administrator sessions revoked.');
  } else {
    if (await Admin.exists({})) throw new Error('An administrator already exists; refusing to replace it');
    await Admin.create({username: data.username.toLowerCase(), passwordHash});
    console.log('Administrator created. Sign in at /admin.');
  }
} finally { await mongoose.disconnect(); }
