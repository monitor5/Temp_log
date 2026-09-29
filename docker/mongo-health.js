try {
  const appDb = db.getSiblingDB('archlog');
  if (!appDb.auth('archlog', process.env.MONGO_APP_PASSWORD)) quit(1);
  quit(appDb.runCommand({ping: 1}).ok === 1 ? 0 : 1);
} catch { quit(1); }
