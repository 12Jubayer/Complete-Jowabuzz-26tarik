import { Client } from 'ssh2';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Host details
const host = '85.120.253.100';
const username = 'root';
const password = '2uRXV3zsX7HsKut1XP';

// Local and remote paths
const projectRoot = join(__dirname, '..', '..');
const localZipPath = join(projectRoot, 'frontend', 'dist.zip');
const remoteDestDir = '/www/wwwroot/jowabuzz/frontend';
const remoteZipPath = '/tmp/jowabuzz-frontend-dist.zip';

console.log(`Local ZIP path: ${localZipPath}`);
if (!existsSync(localZipPath)) {
  console.error(`[ERROR] Local zip file not found at: ${localZipPath}`);
  process.exit(1);
}

console.log(`Connecting to remote server ${host}...`);
const conn = new Client();

conn.on('ready', () => {
  console.log('SSH connection established successfully.');
  
  // Use SFTP to upload the zip file
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      process.exit(1);
    }
    
    console.log(`Uploading ${localZipPath} to ${remoteZipPath}...`);
    sftp.fastPut(localZipPath, remoteZipPath, {}, (uploadErr) => {
      if (uploadErr) {
        console.error('Upload Error:', uploadErr);
        conn.end();
        process.exit(1);
      }
      
      console.log('Upload completed successfully. Extracting on remote server...');
      
      // Commands to run on server:
      // 1. Ensure target directory exists
      // 2. Clear old files in target directory
      // 3. Extract zip directly into target directory
      // 4. Remove remote temporary zip file
      const commands = [
        `mkdir -p "${remoteDestDir}"`,
        `rm -rf "${remoteDestDir}"/*`,
        `unzip -o "${remoteZipPath}" -d "${remoteDestDir}" || [ $? -eq 1 ]`,
        `rm -f "${remoteZipPath}"`
      ].join(' && ');
      
      console.log(`Executing commands: ${commands}`);
      
      conn.exec(commands, (execErr, stream) => {
        if (execErr) {
          console.error('Execution Error:', execErr);
          conn.end();
          process.exit(1);
        }
        
        let stdoutData = '';
        let stderrData = '';
        
        stream.on('close', (code, signal) => {
          console.log(`Command execution completed with exit code: ${code}`);
          conn.end();
          if (code === 0) {
            console.log('Frontend deployed successfully to production!');
            process.exit(0);
          } else {
            console.error('Frontend deployment failed on remote commands.');
            console.error('STDERR:', stderrData);
            process.exit(code || 1);
          }
        }).on('data', (data) => {
          stdoutData += data;
        }).stderr.on('data', (data) => {
          stderrData += data;
        });
      });
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
