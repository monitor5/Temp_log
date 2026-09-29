#!/usr/bin/env python3
"""Package the original theme using only Python's standard library."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
root = Path(__file__).resolve().parents[1]
target = root / 'artifacts/temp-log.zip'
target.parent.mkdir(exist_ok=True)
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for file in sorted((root / 'theme').rglob('*')):
        if file.is_file() and not file.name.startswith('.'):
            archive.write(file, file.relative_to(root / 'theme'))
print(target)
