import { Client } from 'ssh2';

const host = '85.120.253.100';
const username = 'root';
const password = '2uRXV3zsX7HsKut1XP';

console.log(`Connecting to remote server ${host}...`);
const conn = new Client();

conn.on('ready', () => {
  console.log('SSH connection established successfully.');
  
  // Commands to delete all files inside backend on the server
  const commands = [
    'echo "Deleting backend files on server..."',
    'rm -rf /www/wwwroot/jowabuzz/backend/*',
    'echo "Remote backend cleanup completed."'
  ].join(' && ');
  
  console.log(`Executing remote command: ${commands}`);
  
  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error('Execution Error:', err);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code, signal) => {
      console.log(`Command execution completed with exit code: ${code}`);
      conn.end();
      if (code === 0) {
        console.log('Remote backend files deleted successfully!');
        process.exit(0);
      } else {
        console.error('Failed to delete remote backend files.');
        process.exit(code || 1);
      }
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
