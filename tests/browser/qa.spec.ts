import { createServer } from 'node:http';
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';

const credentials = JSON.parse(readFileSync('artifacts/qa-private.json', 'utf8'));
const baseURL = process.env.BROWSER_QA_URL || credentials.baseURL;
if (!credentials.project.startsWith('temp-log-test-') || !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname) || ['2368', '8080'].includes(new URL(baseURL).port)) throw new Error('Refusing browser writes outside a disposable QA instance');
const binding = spawnSync('docker', ['compose','-p',credentials.project,'port','app','4000'], {encoding:'utf8'});
if (binding.status !== 0 || binding.stdout.trim() !== '127.0.0.1:' + new URL(baseURL).port) throw new Error('QA URL does not match its disposable container');
let owner: BrowserContext;
let admin: Page;
let post: any;
let imageURL = '';
let attachmentURL = '';
const title = 'QA 브라우저 기록';
const errors: string[] = [];
let readWindowStart = Date.now();
const httpErrors: {path:string; status:number}[] = [];
const screenshotDir = 'artifacts/browser-qa';
const csrf = {'Content-Type': 'application/json', 'X-Requested-With': 'TempLog'};

async function api(page: Page, path: string, method = 'GET', body?: unknown) {
  return page.evaluate(async ({path, method, body, csrf}) => {
    const response = await fetch(path, {method, credentials: 'same-origin', headers: csrf, body: body === undefined ? undefined : JSON.stringify(body)});
    return {status: response.status, body: await response.json().catch(() => null)};
  }, {path, method, body, csrf});
}
async function visuallyReady(locator: ReturnType<Page['locator']>) {
  await expect.poll(() => locator.evaluate(element => {
    for (let current: Element | null = element; current; current = current.parentElement) {
      if (Number(getComputedStyle(current).opacity) < 0.99) return false;
    }
    return true;
  })).toBe(true);
}

async function login(page: Page) {
  await page.goto(baseURL + '/admin');
  await page.getByRole('textbox', {name: '사용자 이름'}).fill(credentials.username);
  await page.getByLabel('비밀번호', {exact: true}).fill(credentials.password);
  await page.getByRole('button', {name: '로그인', exact: true}).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
}
function row() { return admin.getByRole('article', {name: title, exact: true}); }
async function save(label = '초안 저장') {
  const response = admin.waitForResponse(r => /\/api\/posts(?:\/[^/?]+)?$/.test(new URL(r.url()).pathname) && ['POST', 'PATCH'].includes(r.request().method()));
  await admin.getByRole('button', {name: label, exact: true}).click();
  const result = await response;
  expect(result.ok()).toBeTruthy();
  post = (await result.json()).data;
  await expect(admin).toHaveURL(/\/admin\/dashboard$/);
}
function png(red = 195, green = 65, blue = 48) {
  function crc(data: Buffer) { let c = 0xffffffff; for (const byte of data) { c ^= byte; for (let j = 0; j < 8; j++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ 0xffffffff) >>> 0; }
  function chunk(name: string, data: Buffer) { const kind = Buffer.from(name); const header = Buffer.alloc(4); header.writeUInt32BE(data.length); const tail = Buffer.alloc(4); tail.writeUInt32BE(crc(Buffer.concat([kind, data]))); return Buffer.concat([header, kind, data, tail]); }
  const header = Buffer.alloc(13); header.writeUInt32BE(2, 0); header.writeUInt32BE(2, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.from([0,red,green,blue,red,green,blue,0,red,green,blue,red,green,blue]))), chunk('IEND', Buffer.alloc(0))]);
}
async function upload(input: ReturnType<Page['locator']>, name: string, buffer: Buffer, mimeType: string) {
  const wait = admin.waitForResponse(r => new URL(r.url()).pathname === '/api/upload' && r.request().method() === 'POST');
  await input.setInputFiles({name, buffer, mimeType});
  return await wait;
}

test.describe.configure({mode: 'serial'});
test.beforeAll(async ({browser}) => {
  readWindowStart = Date.now();
  owner = await browser.newContext({baseURL, viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
  admin = await owner.newPage();
  admin.on('pageerror', error => errors.push(error.message));
  await login(admin);
  // Only this disposable database: remove previous QA posts for repeatability.
  const list = await api(admin, '/api/posts?includeHidden=true&limit=50');
  expect(list.status).toBe(200);
  for (const item of list.body.data) expect((await api(admin, '/api/posts/' + item._id, 'DELETE')).status).toBe(200);
});
test.beforeEach(async ({page}) => { page.on('pageerror', error => errors.push(error.message)); page.on('response', response => { if (response.status() >= 400) httpErrors.push({path:new URL(response.url()).pathname,status:response.status()}); }); });
test.afterEach(async ({}, info) => { if (info.status !== info.expectedStatus) await info.attach('http-statuses', {body:JSON.stringify(httpErrors.slice(-30)),contentType:'application/json'}); expect(errors, 'uncaught browser errors').toEqual([]); });
test.afterAll(async () => { await owner?.close(); });

test('01 branding, public navigation and real empty states', async ({page}) => {
  for (const url of ['/', '/gallery', '/gallery?type=project', '/gallery?type=essay', '/contact']) {
    await page.goto(baseURL + url);
    await expect(page).toHaveTitle('Temp-Log');
    await expect(page.getByRole('link', {name: 'Temp-Log', exact: true})).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Arch-Log');
  }
  await page.goto(baseURL + '/');
  await expect(page.getByText('홈에 고정된 글이 없습니다.')).toBeVisible();
  await page.getByRole('link', {name: '전체 글 보기'}).click();
  await expect(page.getByText('아직 공개된 게시글이 없습니다.')).toBeVisible();
  await page.goto(baseURL + '/does-not-exist');
  await expect(page.getByRole('heading', {name: '페이지를 찾을 수 없습니다'})).toBeVisible();
  await page.getByRole('link', {name: '홈으로 돌아가기'}).click();
  await expect(page).toHaveURL(baseURL + '/');
});

test('02 anonymous admin route and invalid login recover clearly', async ({page}) => {
  await page.goto(baseURL + '/admin/editor');
  await expect(page.getByRole('heading', {name: 'Temp-Log Admin'})).toBeVisible();
  await page.getByRole('textbox', {name: '사용자 이름'}).fill(credentials.username);
  await page.getByLabel('비밀번호', {exact: true}).fill('incorrect-password');
  await page.getByRole('button', {name: '로그인', exact: true}).click();
  await expect(page.getByRole('alert')).toContainText('잘못된 자격');
  await expect(page.getByRole('button', {name: '로그인', exact: true})).toBeEnabled();
  const rejected = await api(page, '/api/posts', 'POST', {title: 'anonymous', content: 'blocked'});
  expect(rejected.status).toBe(401);
});

test('03 editor validation and dirty navigation/back protection', async () => {
  await admin.getByRole('link', {name: '새 게시글', exact: true}).click();
  await admin.locator('#editor-title').fill('   ');
  await admin.locator('#editor-content').fill('   ');
  await expect(admin.getByRole('button', {name: '초안 저장', exact: true})).toBeDisabled();
  await admin.locator('#editor-title').fill(title);
  await admin.locator('#editor-content').fill('작성 중인 내용');
  let reloadWarned = false;
  admin.once('dialog', dialog => { reloadWarned = dialog.type() === 'beforeunload'; void dialog.dismiss(); });
  await admin.reload({timeout:2000}).catch(() => null);
  expect(reloadWarned).toBe(true);
  await expect(admin.locator('#editor-content')).toHaveValue('작성 중인 내용');
  const cancelled = admin.waitForEvent('dialog');
  await admin.evaluate(() => history.back());
  await (await cancelled).dismiss();
  await expect(admin.locator('#editor-content')).toHaveValue('작성 중인 내용');
  const accepted = admin.waitForEvent('dialog');
  const leave = admin.getByRole('link', {name: '대시보드로', exact: true}).click();
  await (await accepted).accept();
  await leave;
  await expect(admin).toHaveURL(/\/admin\/dashboard$/);
});

test('04 create draft through UI with thumbnail and Markdown image', async () => {
  await admin.getByRole('link', {name: '새 게시글', exact: true}).click();
  await admin.locator('#editor-title').fill(title);
  await admin.locator('#editor-content').fill('# 첫 기록\n\n브라우저에서 직접 작성한 테스트입니다.');
  await admin.locator('#editor-tags').fill('qa, 기록');
  const thumbnail = await upload(admin.locator('#editor-thumbnail'), 'thumbnail.png', png(), 'image/png');
  expect(thumbnail.status()).toBe(201);
  imageURL = (await thumbnail.json()).data.url;
  const image = await upload(admin.locator('#editor-files'), 'image[qa].png', png(), 'image/png');
  expect(image.status()).toBe(201);
  await expect(admin.locator('#editor-content')).toHaveValue(/!\[/);
  await save();
  expect(post.isHidden).toBe(true);
  expect(post.thumbnail).toBe(imageURL);
  await expect(row()).toBeVisible();
});

test('05 draft body, comments and admin listing remain private', async ({page}) => {
  await page.goto(baseURL + '/gallery');
  await expect(page.getByText(title, {exact: true})).toHaveCount(0);
  for (const path of ['/api/posts/' + post._id, '/api/posts/' + encodeURIComponent(post.slug), '/api/comments?postId=' + post._id]) expect((await api(page, path)).status).toBe(404);
  expect((await api(page, '/api/posts?includeHidden=true')).status).toBe(401);
  await page.goto(baseURL + '/project/' + encodeURIComponent(post.slug));
  await expect(page.getByRole('heading', {name: '404', exact: true})).toBeVisible();
});

test('06 thumbnail removal persists and referenced media cannot be deleted', async () => {
  expect((await api(admin, '/api/upload/' + imageURL.split('/').pop(), 'DELETE')).status).toBe(409);
  await row().getByRole('link', {name: '수정', exact: true}).click();
  await admin.getByRole('button', {name: '썸네일 삭제'}).click();
  await save();
  expect(post.thumbnail || '').toBe('');
  await row().getByRole('link', {name: '수정', exact: true}).click();
  await expect(admin.getByRole('button', {name: '썸네일 삭제'})).toHaveCount(0);
  await admin.getByRole('link', {name: '대시보드로', exact: true}).click();
  expect((await api(admin, '/api/upload/' + imageURL.split('/').pop(), 'DELETE')).status).toBe(200);
});

test('07 PDF and actual WebM upload, malicious/oversize upload feedback', async () => {
  await row().getByRole('link', {name: '수정', exact: true}).click();
  const pdf = await upload(admin.locator('#editor-files'), 'document.pdf', Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF'), 'application/pdf');
  expect(pdf.status()).toBe(201);
  attachmentURL = (await pdf.json()).data.url;
  const webm = await admin.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width=64; canvas.height=64;
    const context = canvas.getContext('2d')!; const stream=canvas.captureStream(10);
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm'}); const chunks: Blob[]=[];
    return await new Promise<number[]>(resolve => {
      recorder.ondataavailable=e=>chunks.push(e.data);
      recorder.onstop=async()=>{stream.getTracks().forEach(track=>track.stop());resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())));};
      recorder.start(); context.fillStyle='#123456'; context.fillRect(0,0,64,64); setTimeout(()=>recorder.stop(),250);
    });
  });
  expect((await upload(admin.locator('#editor-files'), 'clip.webm', Buffer.from(webm), 'video/webm')).status()).toBe(201);
  const bad=await upload(admin.locator('#editor-files'), 'fake.png', Buffer.from('<script>alert(1)</script>'), 'image/png');
  expect(bad.status()).toBe(400);
  await expect(admin.getByRole('alert')).toBeVisible();
  await admin.locator('#editor-files').setInputFiles({name:'unsafe.svg', mimeType:'image/svg+xml', buffer:Buffer.from('<svg/>')});
  await expect(admin.getByRole('alert')).toContainText(/지원|허용/);
  await admin.locator('#editor-files').setInputFiles({name:'oversize.pdf', mimeType:'application/pdf', buffer:Buffer.alloc(26*1024*1024)});
  await expect(admin.getByRole('alert')).toBeVisible();
  const rejectedByServer=await admin.evaluate(async()=>{const payload=new Uint8Array(26*1024*1024);payload.set(new TextEncoder().encode('%PDF-1.4'));const form=new FormData();form.append('file',new Blob([payload],{type:'application/pdf'}),'oversize.pdf');return (await fetch('/api/upload',{method:'POST',headers:{'X-Requested-With':'TempLog'},body:form})).status;});
  expect(rejectedByServer).toBe(413);
  await save();
});

test('08 save failure preserves unsaved input and recovers on retry', async () => {
  await row().getByRole('link', {name:'수정', exact:true}).click();
  const content = await admin.locator('#editor-content').inputValue();
  await admin.locator('#editor-content').fill(content + '\n\n저장 실패 후 보존할 문장');
  await admin.route('**/api/posts/' + post._id, route => route.request().method()==='PATCH' ? route.fulfill({status:500,contentType:'application/json',body:'{"error":"QA temporary failure"}'}) : route.continue());
  await admin.getByRole('button',{name:'초안 저장',exact:true}).click();
  await expect(admin.getByRole('alert')).toContainText(/QA temporary failure|실패/);
  await expect(admin.locator('#editor-content')).toHaveValue(/보존할 문장/);
  await admin.unroute('**/api/posts/' + post._id);
  await save();
});

test('09 publishing/pinning/unpublishing updates UI and reader visibility', async ({page}) => {
  await row().getByRole('button', {name:'공개',exact:true}).click();
  await expect(row().getByRole('button',{name:'숨김',exact:true})).toBeVisible();
  await page.goto(baseURL + '/');
  await expect(page.getByText('홈에 고정된 글이 없습니다.')).toBeVisible();
  await row().getByRole('button',{name:'홈에 고정',exact:true}).click();
  await expect(row().getByRole('button',{name:'홈 고정 해제',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await page.getByRole('link').filter({has:page.getByRole('heading',{name:title,exact:true})}).click();
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await expect(page.locator('video')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.locator('a[href="' + attachmentURL + '"]').click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await row().getByRole('button',{name:'숨김',exact:true}).click();
  await expect(row().getByRole('button',{name:'공개',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:'404',exact:true})).toBeVisible();
  await row().getByRole('button',{name:'공개',exact:true}).click();
  await expect(row().getByRole('button',{name:'숨김',exact:true})).toBeVisible();
});

test('10 search URL synchronization, filtering, Escape and focus return', async ({page}) => {
  await page.goto(baseURL + '/');
  await page.getByRole('textbox',{name:'검색어'}).fill('브라우저');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await expect(page).toHaveURL(/query=/);
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  const trigger=page.getByRole('button',{name:'검색',exact:true}); await trigger.click();
  const dialog=page.getByRole('dialog',{name:'검색',exact:true});
  await expect(dialog.getByRole('textbox',{name:'검색어'})).toHaveValue('브라우저');
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
  await page.goto(baseURL+'/gallery?type=essay&query=missing');
  await expect(page.getByText('검색 결과가 없습니다.')).toBeVisible();
  await trigger.click();await expect(dialog.getByRole('textbox',{name:'검색어'})).toHaveValue('missing');
  await page.keyboard.press('Tab');await expect.poll(()=>page.evaluate(()=>!!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  await page.keyboard.press('Escape');
});

test('11 gallery/admin pagination and invalid URL recovery', async ({page}) => {
  for(let i=0;i<25;i++) expect((await api(admin,'/api/posts','POST',{title:'QA pagination '+String(i).padStart(2,'0'),content:'page fixture',isHidden:false})).status).toBe(201);
  await page.goto(baseURL+'/gallery?page=999');
  await expect(page).toHaveURL(/page=2/);await expect(page.getByRole('navigation',{name:'갤러리 페이지'})).toBeVisible();
  await page.getByRole('navigation',{name:'갤러리 페이지'}).getByRole('button',{name:'이전'}).click();
  await expect(page).toHaveURL(/page=1/);
  await page.goto(baseURL+'/gallery?page=1.5&type=bad&sort=bad&order=bad');
  await expect(page.getByRole('heading',{name:'Browse',exact:true})).toBeVisible();
  await expect(page.locator('body')).not.toContainText('콘텐츠를 불러오는데 실패');
  await admin.goto(baseURL+'/admin/dashboard');
  await admin.getByRole('navigation',{name:'게시글 페이지'}).getByRole('button',{name:'다음'}).click();
  await expect(admin.getByRole('navigation',{name:'게시글 페이지'})).toContainText('2 / 2');
  await admin.getByRole('navigation',{name:'게시글 페이지'}).getByRole('button',{name:'이전'}).click();
});

test('12 not-found edit and transient read errors offer recovery', async ({page}) => {
  await admin.goto(baseURL+'/admin/editor/000000000000000000000000');
  await expect(admin.getByRole('alert')).toBeVisible();
  await expect(admin.getByRole('button',{name:'다시 불러오기'})).toBeVisible();
  await expect(admin.locator('#editor-content')).toHaveCount(0);
  await page.route('**/api/posts/'+encodeURIComponent(post.slug), route=>route.fulfill({status:500,contentType:'application/json',body:'{"error":"Temporary server error"}'}));
  await page.goto(baseURL+'/project/'+encodeURIComponent(post.slug));
  await expect(page.getByRole('heading',{name:'게시글을 불러오지 못했습니다'})).toBeVisible();
  await page.unroute('**/api/posts/'+encodeURIComponent(post.slug));
  await page.getByRole('button',{name:'다시 시도'}).click();
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await page.route('**/api/posts/'+encodeURIComponent(post.slug),route=>route.fulfill({status:200,contentType:'text/html',body:'<html>Malformed proxy response</html>'}));
  await page.reload();await expect(page.getByRole('heading',{name:'게시글을 불러오지 못했습니다'})).toBeVisible();
  await page.unroute('**/api/posts/'+encodeURIComponent(post.slug));await page.getByRole('button',{name:'다시 시도'}).click();
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await admin.goto(baseURL+'/admin/dashboard');
});

test('13 guest comments validate, delete by Enter, reset errors and Escape', async ({page}) => {
  await page.goto(baseURL+'/project/'+encodeURIComponent(post.slug));
  await page.getByRole('textbox',{name:'댓글 작성자'}).fill('QA 독자');
  await page.getByLabel('댓글 비밀번호',{exact:true}).fill('가'.repeat(25));
  await page.getByRole('textbox',{name:'댓글 내용'}).fill('삭제를 확인할 댓글');
  await page.getByRole('button',{name:'댓글 작성',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('72바이트');
  await page.getByLabel('댓글 비밀번호',{exact:true}).fill('comment-password');
  await page.getByRole('button',{name:'댓글 작성',exact:true}).click();
  await expect(page.getByText('삭제를 확인할 댓글',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'댓글 삭제',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'댓글 삭제',exact:true});
  await dialog.getByLabel('삭제 비밀번호').fill('wrong-password');await dialog.getByLabel('삭제 비밀번호').press('Enter');
  await expect(dialog.getByRole('alert')).toContainText('일치하지');
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
  await page.getByRole('button',{name:'댓글 삭제',exact:true}).click();await expect(dialog.getByRole('alert')).toHaveCount(0);
  await dialog.getByLabel('삭제 비밀번호').fill('comment-password');await dialog.getByLabel('삭제 비밀번호').press('Enter');
  await expect(dialog).toBeHidden();await expect(page.getByText('삭제를 확인할 댓글',{exact:true})).toHaveCount(0);
});

test('14 comment read failure is not an empty state; moderation works', async ({page}) => {
  await page.route('**/api/comments?**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"QA unavailable"}'}));
  await page.goto(baseURL+'/project/'+encodeURIComponent(post.slug));
  await expect(page.getByText('댓글을 불러오지 못했습니다.')).toBeVisible();
  await expect(page.getByText('아직 댓글이 없습니다. 첫 댓글을 남겨보세요!')).toHaveCount(0);
  await page.unroute('**/api/comments?**');await page.getByRole('button',{name:'댓글 다시 불러오기'}).click();
  await page.getByRole('textbox',{name:'댓글 작성자'}).fill('QA 독자');await page.getByLabel('댓글 비밀번호',{exact:true}).fill('comment-password');await page.getByRole('textbox',{name:'댓글 내용'}).fill('관리자가 지울 댓글');await page.getByRole('button',{name:'댓글 작성',exact:true}).click();await expect(page.getByText('관리자가 지울 댓글',{exact:true})).toBeVisible();
  await admin.goto(baseURL+'/project/'+encodeURIComponent(post.slug));await admin.getByRole('button',{name:'댓글 삭제',exact:true}).click();const dialog=admin.getByRole('dialog',{name:'댓글 삭제',exact:true});await expect(dialog.getByText('관리자 권한으로 이 댓글을 삭제합니다.')).toBeVisible();await dialog.getByRole('button',{name:'삭제',exact:true}).click();await expect(admin.getByText('관리자가 지울 댓글',{exact:true})).toHaveCount(0);
});

test('15 browser security probes reject injection, malformed writes and unsafe embeds', async ({page}) => {
  await admin.goto(baseURL+'/admin/dashboard');
  expect((await api(admin,'/api/posts','POST',{title:'reserved',content:'body',slug:'featured'})).status).toBe(400);
  expect((await api(admin,'/api/posts','POST',{title:'empty',content:'   '})).status).toBe(400);
  expect((await api(admin,'/api/posts?sort=%24where')).status).toBe(400);
  expect((await api(admin,'/api/upload/a%00.png','DELETE')).status).toBe(400);
  expect((await api(admin,'/uploads/a%00.png')).status).toBe(404);
  expect((await api(admin,'/api/posts','POST',{title:'too big',content:'x'.repeat(2200000)})).status).toBe(413);
  const missing=await admin.evaluate(async()=> (await fetch('/api/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'csrf',content:'blocked'})})).status);expect(missing).toBe(403);
  const hostileServer=createServer((_request,response)=>{response.setHeader('Content-Type','text/html');response.end('<!doctype html><title>QA cross-origin page</title>');});
  await new Promise<void>(resolve=>hostileServer.listen(0,'127.0.0.1',resolve));
  const address=hostileServer.address();if(!address||typeof address==='string')throw new Error('QA origin did not start');
  const hostilePage=await owner.newPage();
  try {
    await hostilePage.goto('http://'+new URL(baseURL).hostname+':'+address.port);
    await hostilePage.evaluate(base=>{const form=document.createElement('form');form.action=base+'/api/posts';form.method='POST';for(const [name,value] of [['title','CSRF-probe'],['content','blocked']]){const input=document.createElement('input');input.name=name;input.value=value;form.append(input);}const button=document.createElement('button');button.textContent='Submit cross-origin probe';form.append(button);document.body.append(form);},baseURL);
    const denied=hostilePage.waitForResponse(response=>response.url()===baseURL+'/api/posts'&&response.request().method()==='POST');
    await hostilePage.getByRole('button',{name:'Submit cross-origin probe'}).click();
    const rejection=await denied;expect(rejection.status()).toBe(403);
    expect((await rejection.request().allHeaders()).origin).not.toBe(baseURL);
  } finally { await hostilePage.close(); await new Promise<void>(resolve=>hostileServer.close(()=>resolve())); }

  const content='# Safe heading\n<script>window.__qaUnsafe=1</script><img src="/missing-image" onerror="window.__qaUnsafe=2"><iframe src="https://untrusted.example/frame"></iframe>\n[link](javascript:alert(1))';
  expect((await api(admin,'/api/posts/'+post._id,'PATCH',{content})).status).toBe(200);
  await page.goto(baseURL+'/project/'+encodeURIComponent(post.slug));await expect(page.getByRole('heading',{name:'Safe heading'})).toBeVisible();
  expect(await page.evaluate(()=>({executed:(window as any).__qaUnsafe,handler:!!document.querySelector('[onerror]'),frame:!!document.querySelector('iframe[src*="untrusted"]'),activeLink:!!document.querySelector('a[href^="javascript:"]')}))).toEqual({executed:undefined,handler:false,frame:false,activeLink:false});
  expect((await api(admin,'/api/posts/'+post._id,'PATCH',{content:'# Safe heading\n\nRestored QA content'})).status).toBe(200);
});

test('16 mobile navigation, long content, keyboard and contact states', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto(baseURL+'/');await expect(page.getByRole('link',{name:'Temp-Log',exact:true})).toBeVisible();
  const menu=page.getByRole('button',{name:/메뉴/});await menu.click();await page.getByRole('link',{name:'Project',exact:true}).click();
  await expect(page).toHaveURL(/type=project/);
  const brightImage=await admin.evaluate(async bytes=>{const data=new FormData();data.append('file',new Blob([new Uint8Array(bytes)],{type:'image/png'}),'bright.png');const response=await fetch('/api/upload',{method:'POST',headers:{'X-Requested-With':'TempLog'},body:data});return {status:response.status,body:await response.json()};},Array.from(png(255,255,255)));
  expect(brightImage.status).toBe(201);
  const heroTitle='T'.repeat(200);
  const bright=await api(admin,'/api/posts','POST',{title:heroTitle,content:'bright hero visual QA',isHidden:false,isFeatured:true,thumbnail:brightImage.body.data.url,tags:['long-tag-'.repeat(5)]});expect(bright.status).toBe(201);
  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});await page.goto(baseURL+'/');
    const heading=page.getByRole('heading',{name:heroTitle,exact:true});await visuallyReady(heading);
    const card=page.getByRole('article').filter({has:heading});const caption=card.getByText('project',{exact:true});
    const h=await heading.boundingBox();const c=await caption.boundingBox();const cardBox=await card.boundingBox();
    const pager=page.getByRole('button',{name:'대표 글 1 보기',exact:true});const pagerBox=await pager.boundingBox();expect(pagerBox!.height).toBeGreaterThanOrEqual(44);expect(h!.y+h!.height).toBeLessThanOrEqual(pagerBox!.y);
    expect(h!.y).toBeGreaterThanOrEqual(c!.y+c!.height);expect(h!.y+h!.height).toBeLessThanOrEqual(cardBox!.y+cardBox!.height);expect(h!.height).toBeLessThan(100);expect(cardBox!.x+cardBox!.width).toBeLessThanOrEqual(width);expect(h!.x+h!.width).toBeLessThanOrEqual(width);
    const ratio=await caption.evaluate(element=>{const style=getComputedStyle(element);const fg=style.color.match(/[0-9.]+/g)!.map(Number);const bg=style.backgroundColor.match(/[0-9.]+/g)!.map(Number);const alpha=bg[3]??1;const background=bg.slice(0,3).map(c=>c*alpha+255*(1-alpha));const lum=(v:number[])=>v.map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);return (lum(fg)+.05)/(lum(background)+.05);});expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'대표 글 2 보기',exact:true}).press('Enter');await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();await page.getByRole('button',{name:'대표 글 1 보기',exact:true}).click();await visuallyReady(heading);
    await page.screenshot({path:screenshotDir+'/hero-bright-'+width+'.png',fullPage:false});
  }
  expect((await api(admin,'/api/posts/'+bright.body.data._id,'DELETE')).status).toBe(200);
  expect((await api(admin,'/api/upload/'+brightImage.body.data.filename,'DELETE')).status).toBe(200);
  const long='긴제목'.repeat(50);
  const response=await api(admin,'/api/posts','POST',{title:long,content:'# 글\n\n'+('긴본문'.repeat(300))+'\n\n```text\n'+('code'.repeat(100))+'\n```',isHidden:false});expect(response.status).toBe(201);
  await page.goto(baseURL+'/project/'+encodeURIComponent(response.body.data.slug));await expect(page.getByRole('heading',{name:long,exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await visuallyReady(page.locator('.prose'));
  await page.screenshot({path:screenshotDir+'/mobile.png',fullPage:true});
  await page.goto(baseURL+'/contact');await expect(page.getByRole('button',{name:'연락처 등록 후 문의 가능'})).toBeDisabled();
  await page.goto(baseURL+'/');await page.setViewportSize({width:1440,height:1000});await visuallyReady(page.getByRole('heading',{name:title,exact:true}));await visuallyReady(page.getByRole('textbox',{name:'검색어'}));await page.screenshot({path:screenshotDir+'/desktop.png',fullPage:true});
});

test('17 pending mutations cannot double submit and delete confirmation recovers', async () => {
  const item=await api(admin,'/api/posts','POST',{title:'QA delete target',content:'remove me'});expect(item.status).toBe(201);
  await admin.goto(baseURL+'/admin/dashboard');const target=admin.getByRole('article',{name:'QA delete target',exact:true});
  let release!:()=>void;let pending=false;const gate=new Promise<void>(resolve=>{release=resolve;});
  await admin.route('**/api/posts/'+item.body.data._id,async route=>{if(route.request().method()==='PATCH'){pending=true;await gate;}await route.continue();});
  await target.getByRole('button',{name:'공개',exact:true}).click();await expect.poll(()=>pending).toBe(true);
  await expect(target.getByRole('button',{name:'삭제',exact:true})).toBeDisabled();await expect(target.getByRole('button',{name:'공개',exact:true})).toBeDisabled();
  release();await expect(target.getByRole('button',{name:'숨김',exact:true})).toBeEnabled();await admin.unroute('**/api/posts/'+item.body.data._id);
  admin.once('dialog',dialog=>dialog.dismiss());await target.getByRole('button',{name:'삭제',exact:true}).click();await expect(target).toBeVisible();
  admin.once('dialog',dialog=>dialog.accept());await target.getByRole('button',{name:'삭제',exact:true}).click();await expect(target).toHaveCount(0);
});

test('18 logout clears protected content in another tab', async () => {
  const tab=await owner.newPage();await tab.goto(baseURL+'/admin/dashboard');await expect(tab.getByRole('heading',{name:'게시글 관리'})).toBeVisible();
  await admin.getByRole('button',{name:'로그아웃'}).click();await expect(admin).toHaveURL(/\/admin$/);
  await tab.bringToFront();await expect(tab).toHaveURL(/\/admin$/);await expect(tab.getByRole('heading',{name:'게시글 관리'})).toHaveCount(0);
  expect(await tab.evaluate(()=>document.cookie.includes('temp_log.sid'))).toBe(false);
  expect(await tab.evaluate(()=>localStorage.getItem('archlog_token'))).toBeNull();
  await tab.close();await login(admin);
});

test('19 server password reset revokes session and focus recheck redirects', async () => {
  const nextPassword=credentials.password+'Z';
  const result=spawnSync('docker',['compose','-p',credentials.project,'exec','-T','app','node','dist/cli/admin.js','--reset-password'],{input:JSON.stringify({username:credentials.username,password:nextPassword}),encoding:'utf8'});expect(result.status).toBe(0);
  credentials.password=nextPassword;writeFileSync('artifacts/qa-private.json',JSON.stringify(credentials),{mode:0o600});
  const other=await owner.newPage();await other.goto('about:blank');await admin.bringToFront();await admin.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(admin).toHaveURL(/\/admin$/);await expect(admin.getByRole('status')).toContainText('다시 로그인');await other.close();await login(admin);
});

test('20 late old-session 401 cannot cancel a newer successful login', async () => {
  let held = false;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const pattern = '**/api/posts?**';
  await admin.route(pattern, async route => {
    if (held || !new URL(route.request().url()).searchParams.has('includeHidden')) { await route.continue(); return; }
    held = true;
    await gate;
    await route.fulfill({status:401,contentType:'application/json',body:'{"error":"Old session expired"}'}).catch(() => {});
  });
  await admin.reload({waitUntil:'domcontentloaded'});
  await expect.poll(() => held).toBe(true);
  const other = await owner.newPage();
  await other.goto(baseURL+'/admin/dashboard');
  await other.getByRole('button',{name:'로그아웃'}).click();
  await expect(admin).toHaveURL(/\/admin$/);
  // Stay in the same document: the previous fetch must remain pending.
  await admin.getByRole('textbox',{name:'사용자 이름'}).fill(credentials.username);
  await admin.getByLabel('비밀번호',{exact:true}).fill(credentials.password);
  await admin.getByRole('button',{name:'로그인',exact:true}).click();
  await expect(admin).toHaveURL(/\/admin\/dashboard$/);
  release();
  await admin.waitForTimeout(300);
  await expect(admin.getByRole('heading',{name:'게시글 관리'})).toBeVisible();
  expect((await api(admin,'/api/auth/me')).status).toBe(200);
  await admin.unroute(pattern);await other.close();
});

test('21 comment pagination reaches comments older than the first 100', async ({page}) => {
  const code = "import mongoose from 'mongoose';import bcrypt from 'bcryptjs';import {Comment} from './dist/models/Comment.js';await mongoose.connect(process.env.MONGO_URI);const passwordHash=await bcrypt.hash('qa-fixture-password',10);await Comment.insertMany(Array.from({length:101},(_,i)=>({postId:process.argv[1],author:'QA pagination',passwordHash,content:'QA paged comment '+String(i).padStart(3,'0')})));await mongoose.disconnect();";
  const seed=spawnSync('docker',['compose','-p',credentials.project,'exec','-T','app','node','--input-type=module','-e',code,post._id],{encoding:'utf8'});expect(seed.status).toBe(0);
  await page.goto(baseURL+'/project/'+encodeURIComponent(post.slug));
  const pages=page.getByRole('navigation',{name:'댓글 페이지'});
  await expect(pages).toContainText('1 / 6');
  for(let i=2;i<=6;i++){await pages.getByRole('button',{name:'다음'}).click();await expect(pages).toContainText(i+' / 6');}
  await expect(page.getByText('QA paged comment 000',{exact:true})).toBeVisible();
});

test('22 real database outage shows retry UI and recovers without data loss', async ({page}) => {
  test.setTimeout(120000);
  const stopped=spawnSync('docker',['compose','-p',credentials.project,'stop','mongo'],{encoding:'utf8'});expect(stopped.status).toBe(0);
  try {
    await page.goto(baseURL+'/gallery');
    await expect(page.getByRole('button',{name:'다시 시도'})).toBeVisible({timeout:30000});
    expect((await api(page,'/health/live')).status).toBe(200);
    expect((await api(page,'/health/ready')).status).toBe(503);
  } finally {
    const started=spawnSync('docker',['compose','-p',credentials.project,'start','--wait','--wait-timeout','90','mongo'],{encoding:'utf8'});expect(started.status).toBe(0);
  }
  await page.getByRole('button',{name:'다시 시도'}).click();
  await expect(page.getByRole('heading',{name:'Browse',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'다시 시도'})).toHaveCount(0);
});

test('23 login throttling reports a real 429 in the UI', async ({page}) => {
  await page.goto(baseURL+'/admin');
  const status=await page.evaluate(async()=>{
    let status=0;
    for(let i=0;i<12&&status!==429;i++)status=(await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'TempLog'},body:JSON.stringify({username:'qa-invalid',password:'incorrect-password'})})).status;
    return status;
  });expect(status).toBe(429);
  await page.getByRole('textbox',{name:'사용자 이름'}).fill('qa-invalid');await page.getByLabel('비밀번호',{exact:true}).fill('incorrect-password');await page.getByRole('button',{name:'로그인',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('너무 많은 로그인 시도');
});

test('24 320px/tablet layouts and keyboard-scrolling content remain usable', async ({page}) => {
  // Preserve the real 100/min production read limiter instead of disabling it for this fast suite.
  await new Promise(resolve => setTimeout(resolve, Math.max(0, 62000 - (Date.now() - readWindowStart))));
  const table='| '+Array.from({length:12},(_,i)=>'Column'+i).join(' | ')+' |\n| '+Array(12).fill('---').join(' | ')+' |\n| '+Array(12).fill('LongCellValue').join(' | ')+' |';
  const made=await api(admin,'/api/posts','POST',{title:'QA wide table',content:table+'\n\n```\n'+('long-code-'.repeat(100))+'\n```',isHidden:false});expect(made.status).toBe(201);
  for(const width of [320,768]){
    await page.setViewportSize({width,height:900});await page.goto(baseURL+'/project/'+encodeURIComponent(made.body.data.slug));
    const tableElement=page.getByRole('table',{name:'본문 표'});await expect(tableElement).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await tableElement.focus();await tableElement.press('ArrowRight');await expect.poll(()=>tableElement.evaluate(element=>element.scrollLeft)).toBeGreaterThan(0);
    await page.getByLabel('코드 블록',{exact:true}).focus();
  }
  await page.setViewportSize({width:390,height:844});await page.goto(baseURL+'/');
  const menu=page.getByRole('button',{name:/메뉴/});await menu.click();await page.keyboard.press('Escape');await expect(menu).toBeFocused();
  await admin.setViewportSize({width:320,height:844});await admin.goto(baseURL+'/admin/dashboard');await expect(admin.getByRole('heading',{name:'게시글 관리'})).toBeVisible();await expect(admin.getByRole('article').first()).toBeVisible();
  expect(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await visuallyReady(admin.getByRole('article').last());
  await admin.screenshot({path:screenshotDir+'/admin-320.png',fullPage:false});
  await admin.setViewportSize({width:1440,height:1000});
});

test('25 background refetch cannot overwrite a dirty editor', async () => {
  await admin.goto(baseURL+'/admin/editor/'+post._id);await expect(admin.locator('#editor-content')).toBeVisible();
  const original=(await api(admin,'/api/posts/'+post._id)).body.data;
  await admin.locator('#editor-content').fill('QA unsaved content must survive reconnection');
  await admin.route('**/api/posts/'+post._id,route=>route.request().method()==='GET'?route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{...original,content:'background copy'}})}):route.continue());
  await admin.clock.install();await admin.clock.fastForward(6*60*1000);
  const refetched=admin.waitForResponse(r=>new URL(r.url()).pathname==='/api/posts/'+post._id&&r.request().method()==='GET');
  await owner.setOffline(true);await owner.setOffline(false);await refetched;
  await expect(admin.locator('#editor-content')).toHaveValue('QA unsaved content must survive reconnection');
  await admin.unroute('**/api/posts/'+post._id);await admin.clock.resume();
  admin.once('dialog',dialog=>dialog.accept());await admin.getByRole('link',{name:'대시보드로',exact:true}).click();await expect(admin).toHaveURL(/\/admin\/dashboard$/);
});

test('26 slow multiple uploads keep Save disabled and both files are inserted', async () => {
  await admin.goto(baseURL+'/admin/editor/'+post._id);await expect(admin.locator('#editor-content')).toBeVisible();
  let held=false;let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await admin.route('**/api/upload',async route=>{if(!held){held=true;await gate;}await route.continue();});
  await admin.locator('#editor-files').setInputFiles([{name:'queue-one.png',mimeType:'image/png',buffer:png()},{name:'queue-two.png',mimeType:'image/png',buffer:png()}]);
  await expect.poll(()=>held).toBe(true);await expect(admin.getByRole('button',{name:'공개 저장',exact:true})).toBeDisabled();
  release();await expect(admin.locator('#editor-content')).toHaveValue(/queue-two/);await expect(admin.getByRole('button',{name:'공개 저장',exact:true})).toBeEnabled();
  await admin.unroute('**/api/upload');await save('공개 저장');
});

test('27 HTML-encoded and case-varied media references remain protected', async ({page}) => {
  const filename=attachmentURL.split('/').pop()!;
  for(const link of ['/uploads/'+filename.replace('.', '&#46;'),'/UPLOADS/'+filename]){
    expect((await api(admin,'/api/posts/'+post._id,'PATCH',{content:'[QA attachment]('+link+')'})).status).toBe(200);
    await page.goto(baseURL+'/project/'+encodeURIComponent(post.slug));await expect(page.getByRole('link',{name:'QA attachment',exact:true})).toBeVisible();
    expect((await api(admin,'/api/upload/'+filename,'DELETE')).status).toBe(409);
  }
  expect((await api(admin,'/api/posts/'+post._id,'PATCH',{content:'QA attachment reference removed'})).status).toBe(200);
  expect((await api(admin,'/api/upload/'+filename,'DELETE')).status).toBe(200);
});

test('28 total upload quota is enforced by the server and errors remain recoverable', async () => {
  const reserve="import fs from 'node:fs';import path from 'node:path';const p=path.join(process.env.UPLOAD_DIR,'.qa-quota-reservation');const fd=fs.openSync(p,'wx');fs.ftruncateSync(fd,Number(process.env.MAX_UPLOAD_TOTAL_MB||1024)*1024*1024);fs.closeSync(fd);";
  expect(spawnSync('docker',['compose','-p',credentials.project,'exec','-T','app','node','--input-type=module','-e',reserve],{encoding:'utf8'}).status).toBe(0);
  try {
    await admin.goto(baseURL+'/admin/editor');await admin.locator('#editor-title').fill('QA quota');await admin.locator('#editor-content').fill('unchanged text');
    const response=await upload(admin.locator('#editor-files'),'quota.png',png(),'image/png');expect(response.status()).toBe(413);
    await expect(admin.getByRole('alert')).toContainText('전체 업로드 용량');await expect(admin.locator('#editor-content')).toHaveValue('unchanged text');
  } finally {
    const cleanup="require('fs').unlinkSync(require('path').join(process.env.UPLOAD_DIR,'.qa-quota-reservation'))";
    expect(spawnSync('docker',['compose','-p',credentials.project,'exec','-T','app','node','-e',cleanup],{encoding:'utf8'}).status).toBe(0);
  }
  admin.once('dialog',dialog=>dialog.accept());await admin.getByRole('link',{name:'대시보드로',exact:true}).click();await expect(admin).toHaveURL(/\/admin\/dashboard$/);
});

test('29 allowed large Korean article saves through the real editor', async () => {
  await admin.getByRole('link',{name:'새 게시글',exact:true}).click();await admin.locator('#editor-title').fill('QA 긴 한국어 본문');await admin.locator('#editor-content').fill('가'.repeat(100000));
  const saved=admin.waitForResponse(r=>new URL(r.url()).pathname==='/api/posts'&&r.request().method()==='POST');
  await admin.getByRole('button',{name:'초안 저장',exact:true}).click();const response=await saved;expect(response.status()).toBe(201);
  const created=(await response.json()).data;expect(created.content.length).toBe(100000);await expect(admin).toHaveURL(/\/admin\/dashboard$/);
  expect((await api(admin,'/api/posts/'+created._id,'DELETE')).status).toBe(200);
});
