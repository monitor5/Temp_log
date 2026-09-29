#!/usr/bin/env python3
from pathlib import Path
import os,secrets
os.umask(0o077)
directory=Path('.secrets');directory.mkdir(exist_ok=True)
app=directory/'original-app.env';mongo=directory/'original-mongo.env'
if app.exists() or mongo.exists(): raise SystemExit('Existing Kubernetes credentials preserved; refusing to overwrite.')
password=secrets.token_hex(32)
app.write_text('SESSION_SECRET='+secrets.token_hex(32)+'\nMONGO_URI=mongodb://archlog:'+password+'@mongo:27017/archlog?authSource=archlog\n')
mongo.write_text('MONGO_APP_PASSWORD='+password+'\nMONGO_ROOT_PASSWORD='+secrets.token_hex(32)+'\n')
print('Created private credential files in .secrets; no values printed.')
