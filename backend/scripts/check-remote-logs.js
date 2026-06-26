import { Client } from 'ssh2';

const host = '85.120.253.100';
const username = 'root';
const password = '2uRXV3zsX7HsKut1XP';

console.log('Connecting to remote server to fetch PM2 logs...');
const conn = new Client();

conn.on('ready', () => {
  console.log('SSH connection established.');
  
  const command = 'pm2 logs jowabuzz --lines 100 --raw --no-color';
  console.log(`Executing command: ${command}`);
  
  conn.exec(command, (err, stream) => {
    if (err) {
      console.error('Execution Error:', err);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code, signal) => {
      conn.end();
      process.exit(0);
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('Connection Error:', err);
  process.exit(1);
}).connect({
  host,
  port: 22,
  username,
  password
});
