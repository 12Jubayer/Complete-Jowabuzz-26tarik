import { Client } from 'ssh2';
import { existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Host details
const host = '85.120.253.100';
const username = 'root';
const password = '2uRXV3zsX7HsKut1XP';

// Local and remote paths
const projectRoot = join(__dirname, '..', '..');
const localTarPath = join(projectRoot, 'backend.tar.gz');
const remoteDestDir = '/www/wwwroot/jowabuzz/backend';
const remoteTarPath = `/www/wwwroot/jowabuzz/backend.tar.gz`;

async function run() {
  try {
    console.log('Archiving backend folder...');
    // Archive backend excluding node_modules, uploads, .env, and temp files
    const tarCommand = 'tar --exclude=node_modules --exclude=uploads --exclude=.env --exclude=*.zip --exclude=*.tar.gz --exclude=scripts/test-ssh.mjs -czf backend.tar.gz -C backend .';
    await execPromise(tarCommand, { cwd: projectRoot });
    console.log(`Archive created successfully at ${localTarPath}`);

    if (!existsSync(localTarPath)) {
      throw new Error(`Archive not found at ${localTarPath}`);
    }

    console.log(`Connecting to remote server ${host}...`);
    const conn = new Client();

    conn.on('ready', () => {
      console.log('SSH connection established successfully.');

      conn.sftp((err, sftp) => {
        if (err) {
          cleanupLocal();
          console.error('SFTP Error:', err);
          conn.end();
          process.exit(1);
        }

        console.log(`Uploading ${localTarPath} to ${remoteTarPath}...`);
        sftp.fastPut(localTarPath, remoteTarPath, {}, (uploadErr) => {
          if (uploadErr) {
            cleanupLocal();
            console.error('Upload Error:', uploadErr);
            conn.end();
            process.exit(1);
          }

          console.log('Upload completed. Extracting on remote server and restarting PM2...');

          // Extract tar.gz, run npm install, restart PM2, clean up remote archive
          const commands = [
            `mkdir -p "${remoteDestDir}"`,
            `tar -xzf "${remoteTarPath}" -C "${remoteDestDir}"`,
            `rm -f "${remoteTarPath}"`,
            `cd "${remoteDestDir}"`,
            `npm install --production`,
            `pm2 reload jowabuzz || pm2 restart jowabuzz`
          ].join(' && ');

          console.log(`Executing commands on server: ${commands}`);

          conn.exec(commands, (execErr, stream) => {
            cleanupLocal();
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
                console.log('Backend deployed successfully to production!');
                process.exit(0);
              } else {
                console.error('Backend deployment failed on remote commands.');
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
      cleanupLocal();
      console.error('Connection Error:', err);
      process.exit(1);
    }).connect({
      host,
      port: 22,
      username,
      password
    });
  } catch (error) {
    cleanupLocal();
    console.error('Error during deploy:', error);
    process.exit(1);
  }
}

function cleanupLocal() {
  if (existsSync(localTarPath)) {
    try {
      unlinkSync(localTarPath);
      console.log('Cleaned up local temporary archive.');
    } catch (e) {
      console.error('Failed to clean up local archive:', e);
    }
  }
}

run();
