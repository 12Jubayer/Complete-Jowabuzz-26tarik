import { Client } from 'ssh2';

const host = '85.120.253.100';
const username = 'root';
const password = '2uRXV3zsX7HsKut1XP';

async function updateDB() {
  console.log(`Connecting to remote server ${host}...`);
  const conn = new Client();

  conn.on('ready', () => {
    console.log('SSH connection established.');

    // We will update the table gaming_gateway_settings using the 32-character key found in the live server's .env file
    const sql = `
      UPDATE jowabuzz.gaming_gateway_settings
      SET
        api_base_url = 'https://api.oraclegames.live',
        launch_url = 'https://crazybet99.com/getgameurl/v2',
        api_key = '918d7148-981d-4f63-8275-2abdd0de27a3',
        secret_key = '0a4c40469ec03dd868299c098da91c6b',
        api_mode = 'production',
        callback_url = 'https://jowabuzz.com/api/oracle/callback',
        webhook_secret = '0a4c40469ec03dd868299c098da91c6b',
        operator_id = 'dsgaming',
        provider_status = 'active'
      WHERE id = 1;
    `;

    const checkSql = `SELECT id, provider_status, api_mode, secret_key, webhook_secret, LENGTH(secret_key) FROM jowabuzz.gaming_gateway_settings WHERE id = 1;`;

    const commands = [
      'echo "=== UPDATING REMOTE DATABASE ==="',
      `mysql -u root -p"656940d50e847e3f" -e "${sql.replace(/\n/g, ' ')}"`,
      'echo ""',
      'echo "=== VERIFYING UPDATE ==="',
      `mysql -u root -p"656940d50e847e3f" -e "${checkSql}"`,
      'echo ""',
      'echo "=== RELOADING PM2 PROCESS ==="',
      'pm2 reload jowabuzz',
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

updateDB();
