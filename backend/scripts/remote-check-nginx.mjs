import { Client } from 'ssh2';

const host = '85.120.253.100';
const username = 'root';
const password = '2uRXV3zsX7HsKut1XP';

async function checkNginx() {
  console.log(`Connecting to remote server ${host}...`);
  const conn = new Client();

  conn.on('ready', () => {
    console.log('SSH connection established.');

    // Command to check status and read the tail of log files
    const commands = [
      'echo "=== NGINX CONFIGS ==="',
      'find /www/server/panel/vhost/nginx/ -name "*jowabuzz*" -exec cat {} \\; || find /etc/nginx/ -name "*jowabuzz*" -exec cat {} \\; || echo "Config not found"',
      'echo ""',
      'echo "=== LOOKING FOR ORACLE IN NGINX ACCESS LOG ==="',
      'grep -i "/api/oracle" /www/wwwlogs/jowabuzz.com.log || echo "No oracle hits in jowabuzz.com.log"',
      'echo ""',
      'echo "=== NGINX RECENT ACCESS LOGS FOR API (LAST 20 LINES) ==="',
      'grep "/api/" /www/wwwlogs/jowabuzz.com.log | tail -n 20 || echo "No API access logs"',
    ].join(' && ');

    conn.exec(commands, (execErr, stream) => {
      if (execErr) {
        console.error('Execution Error:', execErr);
        conn.end();
        process.exit(1);
      }

      let stdoutData = '';
      let stderrData = '';

      stream.on('close', (code) => {
        conn.end();
        console.log(stdoutData);
        if (stderrData) {
          console.error('STDERR:', stderrData);
        }
        process.exit(0);
      }).on('data', (data) => {
        stdoutData += data;
      }).stderr.on('data', (data) => {
        stderrData += data;
      });
    });
  });

  conn.on('error', (err) => {
    console.error('Connection Error:', err);
  });

  conn.connect({
    host,
    port: 22,
    username,
    password
  });
}

checkNginx();
