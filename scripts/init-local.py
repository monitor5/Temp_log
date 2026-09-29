#!/usr/bin/env python3
"""Create local-only credentials without printing or overwriting them."""
from pathlib import Path
import os
import secrets

root = Path(__file__).resolve().parents[1]
path = root / '.env'
try:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    raise SystemExit('.env already exists; keeping the current database credentials.')
with os.fdopen(fd, 'w') as output:
    output.write('GHOST_URL=http://localhost:2368\nGHOST_PORT=2368\nMAILPIT_PORT=8025\n')
    output.write(f'MYSQL_PASSWORD={secrets.token_hex(32)}\n')
    output.write(f'MYSQL_ROOT_PASSWORD={secrets.token_hex(32)}\n')
print('Created .env (0600). Credentials were not printed. Keep this file private.')
