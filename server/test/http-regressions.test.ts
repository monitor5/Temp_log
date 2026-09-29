import { after, afterEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import sharp from 'sharp';

const uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'temp-log-http-test-'));
process.env.SESSION_SECRET = 'isolated-test-secret-that-is-at-least-forty-eight-characters';
process.env.PUBLIC_URL = 'http://localhost:4000';
process.env.UPLOAD_DIR = uploadDirectory;
const { errorHandler } = await import('../src/middlewares/error.middleware.js');
const { sameOriginMutation, jsonBodyParser } = await import('../src/middlewares/request.middleware.js');
const { Post } = await import('../src/models/Post.js');
const { Comment } = await import('../src/models/Comment.js');
const { default: postRoutes } = await import('../src/routes/post.routes.js');
const { default: commentRoutes } = await import('../src/routes/comment.routes.js');
const { default: uploadRoutes } = await import('../src/routes/upload.routes.js');
const { serveUpload } = await import('../src/controllers/upload.controller.js');

// Exercise the production middleware/routes without a shared database or sessions.
// Tests explicitly inject an already-verified admin only where authentication is needed.
function createApp(admin = false) {
  const app = express();
  app.use('/api', sameOriginMutation);
  app.use(jsonBodyParser);
  if (admin) app.use((req, _res, next) => { Object.assign(req, {adminId: 'verified-test-admin'}); next(); });
  app.use('/api/posts', postRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/upload', uploadRoutes);
  app.post('/api/echo', (req, res) => res.json({length: req.body.content.length}));
  app.get('/uploads/:filename', serveUpload);
  app.use(errorHandler);
  return app;
}

const originHeaders = {Origin: 'http://localhost:4000', 'X-Requested-With': 'TempLog'};
afterEach(() => mock.restoreAll());
after(async () => { await fs.rm(uploadDirectory, {recursive: true, force: true}); });

test('write routes reject cross-origin and missing-header requests', async () => {
  const app = createApp(true);
  for (const headers of [
    {},
    {Origin: 'http://localhost:4000'},
    {'X-Requested-With': 'TempLog'},
    {Origin: 'https://attacker.example', 'X-Requested-With': 'TempLog'},
  ]) {
    await request(app).post('/api/echo').set(headers).send({content: 'Hello'}).expect(403);
  }
  await request(app).post('/api/echo').set(originHeaders).send({content: 'Hello'}).expect(200);
});

test('body parser accepts the allowed Korean content length and classifies invalid requests', async () => {
  const app = createApp();
  const accepted = await request(app).post('/api/echo').set(originHeaders).send({content: '가'.repeat(200000)}).expect(200);
  assert.equal(accepted.body.length, 200000);
  await request(app).post('/api/echo').set(originHeaders).send({content: 'x'.repeat(2 * 1024 * 1024)}).expect(413);
  await request(app).post('/api/echo').set(originHeaders).set('Content-Type', 'application/json').send('{broken').expect(400);
  await request(app).post('/api/echo').set(originHeaders).set('Content-Type', 'application/json; charset=made-up').send('{}').expect(415);
});

test('anonymous writes and requests to include drafts are denied before database calls', async () => {
  const app = createApp();
  await request(app).post('/api/posts').set(originHeaders).send({title: 'Test', content: 'Body'}).expect(401);
  await request(app).get('/api/posts?includeHidden=true').expect(401);
  await request(app).get('/api/upload/library').expect(401);
  await request(app).delete('/api/upload/test.png').set(originHeaders).expect(401);
});

test('post detail does not disclose a draft to anonymous readers', async () => {
  const draft = {_id: '1234567890abcdef12345678', title: 'Private draft', isHidden: true};
  mock.method(Post, 'findById', () => ({lean: async () => draft}));
  mock.method(Post, 'findOne', () => ({lean: async () => draft}));
  for (const identifier of [draft._id, 'private-draft']) {
    await request(createApp()).get('/api/posts/' + identifier).expect(404);
    const response = await request(createApp(true)).get('/api/posts/' + identifier).expect(200);
    assert.equal(response.body.data.title, draft.title);
  }
});

test('post listing has deterministic ordering when timestamps or ranks are equal', async () => {
  let actualFilter: unknown;
  let actualSort: unknown;
  const query = {
    sort(sort: unknown) { actualSort = sort; return this; },
    skip() { return this; }, limit() { return this; }, select() { return this; },
    lean: async () => [],
  };
  mock.method(Post, 'find', (filter: unknown) => { actualFilter = filter; return query; });
  mock.method(Post, 'countDocuments', async () => 0);
  await request(createApp()).get('/api/posts?sort=featuredOrder&order=asc').expect(200);
  assert.deepEqual(actualSort, {featuredOrder: 1, _id: 1});
  assert.deepEqual(actualFilter, {isHidden: false});
});

test('auto-generated slugs are distinct even for identical titles created in one millisecond', async () => {
  mock.method(Date, 'now', () => 1700000000000);
  const first = new Post({title: 'Same title', content: 'Body'});
  const second = new Post({title: 'Same title', content: 'Body'});
  await first.validate();
  await second.validate();
  assert.match(first.slug, /^same-title-[a-f0-9-]+$/);
  assert.notEqual(first.slug, second.slug);
});

test('uploads validate file contents and referenced files cannot be deleted', async () => {
  const app = createApp(true);
  await request(app).post('/api/upload').set(originHeaders)
    .attach('file', Buffer.from('<script>alert(1)</script>'), 'fake.png').expect(400);
  const png = await sharp({create: {width: 2, height: 2, channels: 3, background: '#fff'}}).png().toBuffer();
  const response = await request(app).post('/api/upload').set(originHeaders).attach('file', png, 'photo.png').expect(201);
  const {filename, url} = response.body.data;
  await request(app).get(url).expect(200).expect('Content-Type', /image\/png/);
  let references = [{thumbnail: url, content: '', media: [] as string[]}];
  let closed = 0;
  mock.method(Post, 'find', () => ({select: () => ({lean: () => ({cursor: () => ({
    async *[Symbol.asyncIterator]() { yield* references; },
    async close() { closed++; },
  })})})}));
  await request(app).delete('/api/upload/' + filename).set(originHeaders).expect(409);
  assert.equal((await fs.stat(path.join(uploadDirectory, filename))).isFile(), true);
  const encodedUrl = '/uploads/' + Array.from(filename as string, char => '%' + char.charCodeAt(0).toString(16)).join('');
  await request(app).get(encodedUrl).expect(200);
  await request(app).get(url.replace('/uploads/', '/UPLOADS/')).expect(200);
  for (const reference of [
    `![photo](${url.replace('.png', '&#46;png')})`,
    `![photo](${url.replace('.png', '&period;png')})`,
    `![photo](${encodedUrl})`,
    `<img src="${url.replace('/uploads/', '/UPLOADS/')}">`,
  ]) {
    references = [{thumbnail: '', content: reference, media: []}];
    await request(app).delete('/api/upload/' + filename).set(originHeaders).expect(409);
  }
  assert.equal(closed, 5);
  references = [];
  await request(app).delete('/api/upload/' + filename).set(originHeaders).expect(200);
  assert.equal(closed, 6);
  await request(app).get(url).expect(404);
});

test('comments expose total and pagination so older comments remain reachable', async () => {
  const postId = '1234567890abcdef12345678';
  let actualSkip: number | undefined;
  let actualLimit: number | undefined;
  let actualSelection: string | undefined;
  const query = {
    sort() { return this; },
    skip(skip: number) { actualSkip = skip; return this; },
    limit(limit: number) { actualLimit = limit; return this; },
    select(selection: string) { actualSelection = selection; return this; },
    lean: async () => [{_id: 'old-comment', author: 'Reader', content: 'Still visible'}],
  };
  mock.method(Post, 'exists', async () => ({_id: postId}));
  mock.method(Comment, 'find', () => query);
  mock.method(Comment, 'countDocuments', async () => 101);
  const response = await request(createApp()).get('/api/comments?postId=' + postId + '&page=6&limit=20').expect(200);
  assert.equal(response.body.data[0].content, 'Still visible');
  assert.equal(response.body.count, 101);
  assert.deepEqual(response.body.pagination, {page: 6, limit: 20, total: 101, totalPages: 6});
  assert.equal(actualSkip, 100);
  assert.equal(actualLimit, 20);
  assert.equal(actualSelection, '-passwordHash');
  for (const extra of ['page=0', 'page=100001', 'limit=101', 'page=1&page=2']) {
    await request(createApp()).get('/api/comments?postId=' + postId + '&' + extra).expect(400);
  }
});

test('comment pagination still refuses hidden or missing posts', async () => {
  mock.method(Post, 'exists', async () => null);
  await request(createApp()).get('/api/comments?postId=1234567890abcdef12345678&page=2').expect(404);
});

test('media listing rejects invalid and unbounded pagination', async () => {
  const app = createApp(true);
  for (const query of ['page=NaN', 'page=-1', 'page=100001', 'page=1&page=2', 'page=1&extra=true']) {
    await request(app).get('/api/upload/library?' + query).expect(400);
  }
  await request(app).get('/api/upload/library?page=1').expect(200);
});

test('control characters in upload filenames are rejected before a database scan', async () => {
  const app = createApp(true);
  const find = mock.method(Post, 'find', () => ({select: () => ({lean: () => ({cursor: () => ({
    async *[Symbol.asyncIterator]() { /* No references. */ },
    async close() {},
  })})})}));
  for (const control of ['%00', '%01', '%1F', '%7F', '%C2%85']) {
    await request(app).delete('/api/upload/a' + control + '.png').set(originHeaders).expect(400);
    await request(app).get('/uploads/a' + control + '.png').expect(404);
  }
  assert.equal(find.mock.callCount(), 0);
});
