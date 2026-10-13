#!/usr/bin/env python3
"""
Cop versi pada semua import modul & stylesheet (elak campuran fail lama + baharu selepas kemas kini).
Jalankan sebelum setiap push:   python3 tools/versi.py
Setiap './x.js' → './x.js?v=YYYYMMDD-HHMM'  (semua fail guna versi SAMA supaya modul tidak berganda).
"""
import re, pathlib, datetime, sys

AKAR = pathlib.Path(__file__).resolve().parent.parent
V = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now().strftime('%Y%m%d-%H%M')

# import ... from './a.js'  |  import('./a.js')  |  import './a.js'
RE_JS = re.compile(r"""((?:from\s+|import\s*\(\s*|import\s+)['"])(\.{1,2}/[^'"?]+?\.js)(?:\?v=[^'"]*)?(['"])""")
# <link rel="stylesheet" href="…style.css">
RE_CSS = re.compile(r"""(href=['"][^'"]*?assets/css/style\.css)(?:\?v=[^'"]*)?(['"])""")

n = 0
for f in list(AKAR.glob('*.html')) + list(AKAR.glob('guru/*.html')) + list(AKAR.glob('admin/*.html')) + list(AKAR.glob('assets/js/*.js')):
    s = f.read_text(encoding='utf-8')
    b = RE_JS.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={V}{m.group(3)}", s)
    b = RE_CSS.sub(lambda m: f"{m.group(1)}?v={V}{m.group(2)}", b)
    if b != s:
        f.write_text(b, encoding='utf-8'); n += 1
print(f'Versi {V} dicop pada {n} fail')
