#!/usr/bin/env python3
"""Exercise a disposable original-app stack, never the user's real app."""
import argparse, base64, http.cookiejar, json, os, secrets, struct, subprocess, urllib.error, urllib.parse, urllib.request, zlib
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('phase',choices=['create','verify'])
parser.add_argument('--url',default='http://localhost:8081')
parser.add_argument('--project',default='temp-log-test-local')
parser.add_argument('--state',default='artifacts/original-smoke.json')
a=parser.parse_args()
assert a.project.startswith('temp-log-test-'), 'Use a disposable test project'
u=urllib.parse.urlsplit(a.url)
assert u.hostname in ('localhost','127.0.0.1') and u.scheme=='http' and u.port!=8080
origin=a.url.rstrip('/');statefile=Path(a.state)
jar=http.cookiejar.LWPCookieJar(str(statefile)+'.cookies')
client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

def req(path,method='GET',data=None,status=200,auth=True,headers=None):
    h={'Origin':origin,'X-Requested-With':'TempLog'}
    h.update(headers or {})
    if isinstance(data,dict): data=json.dumps(data).encode();h['Content-Type']='application/json'
    request=urllib.request.Request(origin+urllib.parse.quote(path,safe='/?=&%:+'),method=method,data=data,headers=h)
    try:
        with (client if auth else urllib.request.build_opener()).open(request,timeout=15) as r: code,body,head=r.status,r.read(),r.headers
    except urllib.error.HTTPError as e: code,body,head=e.code,e.read(),e.headers
    assert code==status,f'{method} {path}: expected {status}, got {code}'
    try: body=json.loads(body)
    except (json.JSONDecodeError,UnicodeDecodeError): pass
    return body,head

def upload(name,data,status=201):
    boundary='temp-log-'+secrets.token_hex(12)
    body=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: application/octet-stream\r\n\r\n').encode()+data+f'\r\n--{boundary}--\r\n'.encode()
    return req('/api/upload','POST',body,status=status,headers={'Content-Type':'multipart/form-data; boundary='+boundary})[0]

if a.phase=='create':
    assert not statefile.exists(), 'Use a new state path for a new test database'
    state={'username':'test-owner','password':secrets.token_urlsafe(36)}
    req('/api/auth/init','POST',state,status=404,auth=False)
    req('/api/posts','POST',{'title':'anonymous','content':'blocked'},status=401,auth=False)
    result=subprocess.run(['docker','compose','-p',a.project,'exec','-T','app','node','dist/cli/admin.js'],input=json.dumps(state),text=True,capture_output=True)
    assert result.returncode==0,'CLI administrator creation failed (possibly initialized database)'
    result,head=req('/api/auth/login','POST',state)
    assert 'token' not in result
    assert 'HttpOnly' in head['Set-Cookie'] and 'SameSite=Strict' in head['Set-Cookie']
    req('/api/auth/me')
    req('/api/posts','POST',{'title':'csrf','content':'blocked'},status=403,headers={'Origin':'https://untrusted.example'})
    req('/api/posts?page=NaN',status=400)
    req('/api/posts?sort=%24where',status=400)
    draft=req('/api/posts','POST',{'title':'비공개 초안','content':'draft-sentinel'},status=201)[0]['data']
    state['draft']=draft['_id'];assert draft['isHidden'] is True
    req('/api/posts?includeHidden=true',status=401,auth=False)
    req('/api/posts/'+draft['slug'],status=404,auth=False)
    req('/api/comments?postId='+draft['_id'],status=404,auth=False)
    req('/api/comments','POST',{'postId':draft['_id'],'author':'reader','password':'reader-test-password','content':'blocked'},status=404,auth=False)
    def chunk(kind,payload): return struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',zlib.crc32(kind+payload))
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',2,2,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\x00\xc4\x3d\x2f\xc4\x3d\x2f'*2))+chunk(b'IEND',b'')
    image=upload('sample.png',png)['data'];state['image']=image['url']
    upload('fake.png',b'<script>alert(1)</script>',400)
    upload('bad.svg',b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',400)
    pdf=upload('document.pdf',b'%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF')['data'];state['file']=pdf['url']
    _,head=req(state['file'],auth=False);assert head['Content-Disposition'].startswith('attachment;')
    public=req('/api/posts','POST',{'type':'project','title':'원래 앱의 첫 기록','content':'# 본문\n\n![이미지]('+state['image']+')\n\n[첨부파일]('+state['file']+')','isHidden':False,'isFeatured':True,'tags':['기록']},status=201)[0]['data'];state['post']=public['_id'];state['slug']=public['slug']
    comment=req('/api/comments','POST',{'postId':state['post'],'author':'독자','password':'test-comment-pass','content':'댓글 유지 검증'},status=201,auth=False)[0]['data']
    req('/api/comments/'+comment['_id'],'DELETE',{'password':'incorrect-password'},status=401,auth=False)
    req('/api/comments/'+comment['_id'],'DELETE',{'password':'test-comment-pass'},auth=False)
    req('/api/auth/logout','POST')
    req('/api/auth/me',status=401)
    req('/api/auth/login','POST',{'username':state['username'],'password':state['password']})
    statefile.parent.mkdir(exist_ok=True)
    fd=os.open(statefile,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as f: json.dump(state,f)
    jar.save(ignore_discard=True,ignore_expires=True);os.chmod(str(statefile)+'.cookies',0o600)
else:
    state=json.loads(statefile.read_text());jar.load(ignore_discard=True,ignore_expires=True)
req('/api/auth/me')
assert req('/api/posts/'+state['post'],auth=False)[0]['data']['title']=='원래 앱의 첫 기록'
assert req(state['image'],auth=False)[0].startswith(b'\x89PNG')
req(state['file'],auth=False)
req('/api/posts/'+state['draft'],status=404,auth=False)
assert all(not p['isHidden'] for p in req('/api/posts',auth=False)[0]['data'])
req('/admin');req('/project/'+state['slug']);req('/health/ready')
print('PASS '+a.phase+': CLI owner, server session, CSRF, drafts, comments, image/PDF, persistence.')
