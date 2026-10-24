#!/usr/bin/env python3
"""Bundles index.html + css + js + font into ONE self-contained file: atelier-prototype-standalone.html
Run from anywhere:  python3 tools/build-standalone.py"""
import re, base64, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(root)
h = open('index.html').read()
font = base64.b64encode(open('assets/fonts/display-black.woff', 'rb').read()).decode()
def css(m):
    s = open(m.group(1)).read().replace('url("../assets/fonts/display-black.woff")', 'url("data:font/woff;base64,%s")' % font)
    return '<style>\n' + s + '\n</style>'
h = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, h)
h = re.sub(r'<script src="([^"]+)"></script>', lambda m: '<script>\n' + open(m.group(1)).read().replace('</script>', '<\\/script>') + '\n</script>', h)
open('atelier-prototype-standalone.html', 'w').write(h); print('standalone', round(len(h) / 1024), 'KB')
