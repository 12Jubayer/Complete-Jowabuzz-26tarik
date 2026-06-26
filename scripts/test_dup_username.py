#!/usr/bin/env python3
import sys, paramiko
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=60)
cmd = """curl -s -w '\\nHTTP:%{http_code}\\n' -X POST http://127.0.0.1:3001/api/auth/register -H 'Content-Type: application/json' -d '{"name":"jb","phone":"01711111111","password":"test1234"}'"""
_, o, _ = c.exec_command(cmd, timeout=30)
print(o.read().decode())
c.close()
