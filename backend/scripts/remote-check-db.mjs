import { Client } from 'ssh2';

const host = '85.120.253.100';
const username = 'root';
const password = '2uRXV3zsX7HsKut1XP';

async function checkDB() {
  console.log(`Connecting to remote server ${host}...`);
  const conn = new Client();

  conn.on('ready', () => {
    console.log('SSH connection established.');

    // Find MySQL credentials from backend/.env on the remote server
    const commands = [
      'echo "=== READING REMOTE oracleGamesApiClient.js ==="',
      'cat /www/wwwroot/jowabuzz/backend/services/oracleGamesApiClient.js',
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

checkDB();
