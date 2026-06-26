import { Client } from 'ssh2';

const host = '85.120.253.100';
const username = 'root';
const password = '2uRXV3zsX7HsKut1XP';

async function fetchLogs() {
  console.log(`Connecting to remote server ${host} to fetch logs...`);
  const conn = new Client();

  conn.on('ready', () => {
    console.log('SSH connection established.');

    // Command to check status and read the tail of log files
    const commands = [
      'echo "=== PM2 STATUS ==="',
      'pm2 status jowabuzz',
      'echo ""',
      'echo "=== GAMING CALLBACK LOG (LAST 30 LINES) ==="',
      'tail -n 30 /www/wwwroot/jowabuzz/backend/logs/gaming-callback.log || echo "File not found"',
      'echo ""',
      'echo "=== ALL INCOMING REQUESTS LOG (LAST 30 LINES) ==="',
      'tail -n 30 /www/wwwroot/jowabuzz/backend/logs/all-requests.log || echo "File not found"',
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

fetchLogs();
