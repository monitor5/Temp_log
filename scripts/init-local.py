#!/usr/bin/env python3
from pathlib import Path
import secrets, os
p = Path(__file__).resolve().parents[1] / '.env'
if p.exists():
    if 'SESSION_SECRET=' not in p.read_text():
        raise SystemExit('Existing .env belongs to another configuration. Preserve it before creating this app config.')
    print('Keeping existing credentials.')
else:
    with os.fdopen(os.open(p, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as f:
        f.write('APP_PORT=8080\nPUBLIC_URL=http://localhost:8080\n')
        for key in ['SESSION_SECRET', 'MONGO_ROOT_PASSWORD', 'MONGO_APP_PASSWORD']:
            f.write(key + '=' + secrets.token_hex(32) + '\n')
    print('Created private .env; no credentials printed.')
