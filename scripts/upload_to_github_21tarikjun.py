#!/usr/bin/env python3
"""Fast full project upload: server archive + local scripts, push to 21tarikjun."""
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

import paramiko

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
REMOTE_ROOT = '/www/wwwroot/jowabuzz'
GITHUB_REPO = 'https://github.com/12Jubayer/21tarikjun.git'
REPO_DIR = Path(__file__).resolve().parent.parent


def log(msg):
    print(msg, flush=True)


def run(cmd, cwd=None, check=True, env=None):
    log('> ' + (' '.join(cmd) if isinstance(cmd, list) else cmd))
    merged = os.environ.copy()
    if env:
        merged.update(env)
    result = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, env=merged)
    if result.stdout.strip():
        log(result.stdout.rstrip())
    if result.stderr.strip():
        log(result.stderr.rstrip())
    if check and result.returncode != 0:
        raise RuntimeError(f'failed: {cmd}')
    return result


def rm_tree(path: Path):
    if not path.exists():
        return
    if os.name == 'nt':
        subprocess.run(['cmd', '/c', 'rmdir', '/s', '/q', str(path)], check=False)
    else:
        shutil.rmtree(path, ignore_errors=True)


def fetch_server_archive():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, 22, USER, PASSWORD, timeout=30)

    archive_remote = '/tmp/jowabuzz-full-upload.tar.gz'
    log('Creating server archive (node_modules, dist, uploads, logs included)...')
    cmd = (
        f'cd /www/wwwroot && tar -czf {archive_remote} '
        f'--exclude=jowabuzz/backend/.env jowabuzz'
    )
    _, stdout, stderr = client.exec_command(cmd, timeout=600)
    code = stdout.channel.recv_exit_status()
    if code != 0:
        raise RuntimeError(stderr.read().decode() or 'tar failed on server')

    sftp = client.open_sftp()
    with tempfile.NamedTemporaryFile(delete=False, suffix='.tar.gz') as tmp:
        local_tar = tmp.name
    log('Downloading server archive...')
    sftp.get(archive_remote, local_tar)
    sftp.close()
    client.exec_command(f'rm -f {archive_remote}')
    client.close()
    return local_tar


def build_upload_tree(local_tar):
    work = Path(tempfile.mkdtemp(prefix='jowabuzz-upload-'))
    log('Extracting server archive to staging folder...')
    with tarfile.open(local_tar, 'r:gz') as tar:
        tar.extractall(path=work, filter='data')

    server_root = work / 'jowabuzz'
    if not server_root.exists():
        raise RuntimeError('Server archive missing jowabuzz root')

    upload_root = work / 'upload'
    upload_root.mkdir(parents=True, exist_ok=True)

    for name in ('backend', 'frontend'):
        src = server_root / name
        dst = upload_root / name
        if src.exists():
            shutil.copytree(src, dst)

    for item in REPO_DIR.iterdir():
        if item.name in {'.git', 'backend', 'frontend', 'node_modules'}:
            continue
        dst = upload_root / item.name
        if item.is_dir():
            shutil.copytree(item, dst, ignore=shutil.ignore_patterns('.git', 'node_modules'))
        else:
            shutil.copy2(item, dst)

    Path(local_tar).unlink(missing_ok=True)
    return upload_root


def write_gitignore(upload_root: Path):
    (upload_root / '.gitignore').write_text(
        """# Secrets only
.env
.env.*
!.env.example
backend/.env
backend/.env.bak*
frontend/.env
scripts/deploy-secrets.ps1
scripts/deploy-secrets.sh
""",
        encoding='utf-8',
    )


def prepare_and_push(upload_root: Path):
    write_gitignore(upload_root)
    run(['git', 'init', '-b', 'main'], cwd=upload_root)
    run(['git', 'add', '-A'], cwd=upload_root)
    result = run(['git', 'status', '--short'], cwd=upload_root)
    log(f'Files staged: {len(result.stdout.splitlines())}')
    run([
        'git', '-c', 'user.name=12Jubayer', '-c', 'user.email=12Jubayer@users.noreply.github.com',
        'commit', '-m', 'Full Jowabuzz project from production server (21tarikjun)',
    ], cwd=upload_root)
    run(['git', 'remote', 'add', 'origin', GITHUB_REPO], cwd=upload_root)

    token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    if token:
        run([
            'git', 'remote', 'set-url', 'origin',
            f'https://{token}@github.com/12Jubayer/21tarikjun.git',
        ], cwd=upload_root)

    env = os.environ.copy()
    env['GCM_INTERACTIVE'] = 'Always'
    env['GIT_TERMINAL_PROMPT'] = '1'
    result = subprocess.run(
        ['git', 'push', '-u', 'origin', 'main', '--force'],
        cwd=upload_root,
        text=True,
        capture_output=True,
        env=env,
    )
    log(result.stdout)
    log(result.stderr)
    if result.returncode != 0:
        raise RuntimeError('git push failed — GitHub login/token required')
    log('SUCCESS: ' + GITHUB_REPO)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    log('Source project: ' + str(REPO_DIR))
    tar_path = fetch_server_archive()
    upload_root = build_upload_tree(tar_path)
    prepare_and_push(upload_root)
