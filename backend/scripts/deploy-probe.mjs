import { Client } from 'ssh2';

const host = '103.165.10.242';
const username = 'root';
const password = 'Jowabuzz@12';

const cmd = process.argv[2] || 'ls -la /www/wwwroot/ 2>/dev/null; ls -la /www/wwwroot/jowabuzz/ 2>/dev/null; pm2 list 2>/dev/null; node -v 2>/dev/null; npm -v 2>/dev/null';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); process.exit(1); }
    stream.on('close', (code) => { conn.end(); process.exit(code || 0); });
    stream.pipe(process.stdout);
    stream.stderr.pipe(process.stderr);
  });
}).on('error', (err) => {
  console.error('Connection failed:', err.message);
  process.exit(1);
}).connect({ host, port: 22, username, password });
