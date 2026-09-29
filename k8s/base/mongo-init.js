// Executed only when an empty MongoDB volume is initialized.
const appDb = db.getSiblingDB('archlog');
appDb.createUser({user: 'archlog', pwd: process.env.MONGO_APP_PASSWORD, roles: [{role: 'readWrite', db: 'archlog'}]});
