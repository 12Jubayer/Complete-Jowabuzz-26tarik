#!/usr/bin/env python3
import paramiko
import time

HOST = '103.168.173.101'
USER = 'root'
PASS = 'Jowabuzz@12'

SCRIPT = r"""
const crypto = require('crypto');
const payload = JSON.stringify({
  order_id: 'DEP-1782231433442-31',
  status: 'success',
  transaction_id: 'REPROCESS-' + Date.now(),
});
const secret = '685ba96b0e29e08dca6f1882ad41';
const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
const http = require('http');
const req = http.request({
  hostname: '127.0.0.1', port: 3001, method: 'POST',
  path: '/api/payment/winypay/deposit-callback',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'x-callback-sign': sig,
  },
}, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('HTTP', res.statusCode, data));
});
req.on('error', e => console.error('ERR', e.message));
req.write(payload);
req.end();
"""

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)
    sftp = c.open_sftp()
    with sftp.file('/tmp/replay_callback.cjs', 'w') as f:
        f.write(SCRIPT)
    sftp.close()
    time.sleep(2)
    _, o, e = c.exec_command('node /tmp/replay_callback.cjs')
    print(o.read().decode())
    print(e.read().decode()[:300])
    _, o, _ = c.exec_command("""mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT id, amount, status, approved_at FROM transactions WHERE id=145;
SELECT balance FROM users WHERE id=31;
SELECT order_id, status FROM winypay_payment_orders WHERE order_id='DEP-1782231433442-31';
" """)
    print(o.read().decode())
    c.close()

if __name__ == '__main__':
    main()
