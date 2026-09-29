// Check a DB-backed page. The public site-info API only reads cached settings.
const http = require('node:http');

const request = http.get({
    host: '127.0.0.1',
    port: Number(process.env.server__port || 2368),
    path: '/',
    headers: {'X-Forwarded-Proto': 'https'},
}, (response) => {
    response.resume();
    process.exit(response.statusCode === 200 ? 0 : 1);
});

// Bound the entire probe, including a hung response, without logging config.
const deadline = setTimeout(() => {
    request.destroy();
    process.exit(1);
}, 4000);
deadline.unref();
request.once('error', () => process.exit(1));
