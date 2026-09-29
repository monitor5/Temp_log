#!/usr/bin/env python3
from getpass import getpass
import json, subprocess, sys
username = input('Admin username (3-50 letters/digits/_/-): ').strip()
password = getpass('New password (14+ characters, max 72 UTF-8 bytes): ')
if password != getpass('Repeat password: '): raise SystemExit('Passwords do not match.')
result = subprocess.run(['docker', 'compose', 'exec', '-T', 'app', 'node', 'dist/cli/admin.js'] + (['--reset-password'] if '--reset-password' in sys.argv else []), input=json.dumps({'username': username, 'password': password}), text=True)
raise SystemExit(result.returncode)
