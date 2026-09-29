const http = require('node:http');
const req = http.get({host: '127.0.0.1', port: Number(process.env.PORT || 4000), path: '/health/ready'}, res => {res.resume(); process.exit(res.statusCode === 200 ? 0 : 1);});
req.on('error', () => process.exit(1));
setTimeout(() => {req.destroy(); process.exit(1);}, 4000).unref();
