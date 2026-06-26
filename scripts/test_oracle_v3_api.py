#!/usr/bin/env python3
"""Test Oracle V3 API endpoints."""
import json
import urllib.request

BASE = 'https://oraclegames.net'
DATA_KEY = '0a4c40469ec03dd868299c098da91c6b'
LAUNCH_KEY = '0a4c40469ec03dd868299c098da91c6b'

def req(method, path, body=None, launch=False):
    url = BASE + path
    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-oracle-key' if launch else 'x-oraclegamedata-key': LAUNCH_KEY if launch else DATA_KEY,
    }
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            text = resp.read().decode('utf-8', 'replace')
            print(f'\n=== {method} {path} -> {resp.status} ===')
            try:
                print(json.dumps(json.loads(text), indent=2)[:3000])
            except Exception:
                print(text[:3000])
    except Exception as e:
        print(f'\n=== {method} {path} ERROR ===')
        print(e)
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8', 'replace')[:2000])

req('GET', '/api/providerlist')
req('GET', '/api/game/JDB')
# get games - need game_uid from provider response first
