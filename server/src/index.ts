import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import { app, sessionStore } from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
await fs.mkdir(config.UPLOAD_DIR, {recursive: true});
await connectDB();
const server = app.listen(config.PORT, '0.0.0.0', () => console.log('Temp-Log listening on port ' + config.PORT));
server.requestTimeout = 60000;
server.headersTimeout = 65000;
let stopping = false;
async function stop() {
  if (stopping) return; stopping = true;
  const force = setTimeout(() => process.exit(1), 25000); force.unref();
  server.close(async () => { await sessionStore.close(); await mongoose.disconnect(); clearTimeout(force); process.exit(0); });
  server.closeIdleConnections();
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
