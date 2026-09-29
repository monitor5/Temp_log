#!/usr/bin/env python3
"""End-to-end test against a NEW, DISPOSABLE localhost Ghost instance.

Creates its first owner and test posts. Never point this at a real blog.
Run create, restart both containers, then verify to test PVC persistence.
"""
import argparse
import struct
import zlib
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import urllib.error
import urllib.parse
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('phase', choices=['create', 'verify'])
parser.add_argument('--url', default='http://localhost:2369')
parser.add_argument('--state', default='artifacts/smoke-state.json')
args = parser.parse_args()
parts = urllib.parse.urlsplit(args.url)
if parts.hostname not in {'localhost', '127.0.0.1'} or parts.scheme != 'http':
    raise SystemExit('Smoke tests are restricted to disposable localhost instances.')
base = args.url.rstrip('/')
jar = http.cookiejar.CookieJar()
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def request(path, method='GET', data=None, status=200, authenticated=True, headers=None):
    opts = {'Origin': base, 'Accept-Version': 'v6.0'}
    if headers:
        opts.update(headers)
    if isinstance(data, dict):
        data = json.dumps(data).encode()
        opts['Content-Type'] = 'application/json'
    req = urllib.request.Request(base + path, data=data, headers=opts, method=method)
    opener = client if authenticated else urllib.request.build_opener()
    try:
        with opener.open(req, timeout=30) as response:
            code, body = response.status, response.read()
    except urllib.error.HTTPError as error:
        code, body = error.code, error.read()
    assert code == status, f'{method} {path}: expected {status}, received {code}'
    if not body:
        return None
    try:
        return json.loads(body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return body


def login(state):
    request('/ghost/api/admin/session/', 'POST', {
        'username': state['email'], 'password': state['password']}, status=201)


state_path = Path(args.state)
if args.phase == 'create':
    assert not state_path.exists(), 'Remove the old disposable smoke state before starting a new test.'
    setup = request('/ghost/api/admin/authentication/setup/')
    assert not setup['setup'][0]['status'], 'Refusing to modify an already initialized blog.'
    state = {'email': 'smoke-owner@example.invalid', 'password': secrets.token_urlsafe(40)}
    request('/ghost/api/admin/authentication/setup/', 'POST', {'setup': [{
        'name': 'Temp_log Test', 'email': state['email'], 'password': state['password'],
        'blogTitle': 'Temp_log'}]}, status=201)
    login(state)
    request('/ghost/api/admin/themes/temp-log/activate/', 'PUT')
    request('/ghost/api/admin/settings/', 'PUT', {'settings': [
        {'key': 'title', 'value': 'Temp_log'},
        {'key': 'description', 'value': '기록하고, 만들고, 다시 생각하기.'},
        {'key': 'locale', 'value': 'ko'},
        {'key': 'members_signup_access', 'value': 'none'},
        {'key': 'portal_button', 'value': False},
        {'key': 'comments_enabled', 'value': 'off'}
    ]})
    # Anonymous admin mutations must be rejected.
    request('/ghost/api/admin/posts/', 'POST', {'posts': [{'title': 'forbidden'}]},
            status=403, authenticated=False)
    draft = request('/ghost/api/admin/posts/?source=html', 'POST', {'posts': [{
        'title': '비공개 초안', 'slug': 'private-smoke-draft', 'status': 'draft',
        'html': '<p>private-draft-sentinel-' + secrets.token_hex(8) + '</p>'
    }]}, status=201)['posts'][0]
    request('/private-smoke-draft/', status=404, authenticated=False)
    home = request('/', authenticated=False).decode()
    assert '비공개 초안' not in home and 'private-draft-sentinel' not in home
    # Upload a tiny PNG through the authenticated native image API.
    def png_chunk(kind, payload):
        return struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind + payload))
    png = (b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', struct.pack('>IIBBBBB', 2, 2, 8, 2, 0, 0, 0))
           + png_chunk(b'IDAT', zlib.compress(b'\x00\xc4\x3d\x2f\xc4\x3d\x2f' * 2)) + png_chunk(b'IEND', b''))
    boundary = 'temp-log-' + secrets.token_hex(16)
    multipart = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="smoke.png"\r\n'
                 'Content-Type: image/png\r\n\r\n').encode() + png + f'\r\n--{boundary}--\r\n'.encode()
    uploaded = request('/ghost/api/admin/images/upload/', 'POST', multipart, status=201,
                       headers={'Content-Type': 'multipart/form-data; boundary=' + boundary})
    image_url = uploaded['images'][0]['url']
    state['image_path'] = urllib.parse.urlsplit(image_url).path
    post = request('/ghost/api/admin/posts/?source=html', 'POST', {'posts': [{
        'title': '첫 기록, 작은 시작', 'slug': 'temp-log-smoke', 'status': 'published',
        'html': '<h2>작업 노트</h2><p>이 글은 작성·업로드·재시작 검증용입니다.</p>'
                '<figure><img alt="업로드 검증" src="' + image_url + '"></figure>',
        'tags': [{'name': '기록', 'slug': 'notes'}]
    }]}, status=201)['posts'][0]
    state['post_id'], state['draft_id'] = post['id'], draft['id']
    file_payload = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="note.txt"\r\n'
                    f'Content-Type: text/plain\r\n\r\nTemp_log attachment test\r\n--{boundary}--\r\n').encode()
    attached = request('/ghost/api/admin/files/upload/', 'POST', file_payload, status=201,
                       headers={'Content-Type': 'multipart/form-data; boundary=' + boundary})
    state['file_path'] = urllib.parse.urlsplit(attached['files'][0]['url']).path
    state_path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(state_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as output:
        json.dump(state, output)
else:
    state = json.loads(state_path.read_text())
    # Preserve browser device cookie across process runs to keep device verification enabled.
    import http.cookiejar as cj
    cookies = cj.LWPCookieJar(str(state_path) + '.cookies')
    cookies.load(ignore_discard=True, ignore_expires=True)
    jar = cookies
    client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    request('/ghost/api/admin/users/me/')

assert '첫 기록, 작은 시작' in request('/temp-log-smoke/', authenticated=False).decode()
assert request(state['image_path'], authenticated=False).startswith(b'\x89PNG')
if state.get('file_path'):
    assert b'Temp_log attachment test' in request(state['file_path'], authenticated=False)
request('/private-smoke-draft/', status=404, authenticated=False)
request('/missing-page-for-test/', status=404, authenticated=False)
assert '첫 기록' in request('/tag/notes/', authenticated=False).decode()
assert 'temp-log-smoke' in request('/rss/', authenticated=False).decode()
request('/ghost/', authenticated=False)
if args.phase == 'create':
    cookies = http.cookiejar.LWPCookieJar(str(state_path) + '.cookies')
    for cookie in jar:
        cookies.set_cookie(cookie)
    cookies.save(ignore_discard=True, ignore_expires=True)
    os.chmod(str(state_path) + '.cookies', 0o600)
print(f'PASS {args.phase}: admin session, theme, post, private draft, image/file, tag, RSS, 404.')
