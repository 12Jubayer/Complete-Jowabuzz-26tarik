#!/usr/bin/env python3
"""Sync server-only assets into local project, then init git and push to GitHub."""
import os
import shutil
import subprocess
import sys
from pathlib import Path

import paramiko

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
REMOTE_ROOT = '/www/wwwroot/jowabuzz'
GITHUB_REPO = 'https://github.com/12Jubayer/20tarik.git'

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


def sftp_sync_tree(sftp, remote_dir, local_dir):
    local_dir.mkdir(parents=True, exist_ok=True)
    for entry in sftp.listdir_attr(remote_dir):
        rpath = f'{remote_dir}/{entry.filename}'
        lpath = local_dir / entry.filename
        if entry.st_mode & 0o40000:
            sftp_sync_tree(sftp, rpath, lpath)
        else:
            log(f'  sync {rpath}')
            lpath.parent.mkdir(parents=True, exist_ok=True)
            sftp.get(rpath, str(lpath))


def sync_from_server():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, 22, USER, PASSWORD, timeout=30)
    sftp = client.open_sftp()

    # Production env + uploads + built frontend
    targets = [
        ('backend/.env', REPO_DIR / 'backend' / '.env'),
        ('backend/uploads', REPO_DIR / 'backend' / 'uploads'),
        ('frontend/dist', REPO_DIR / 'frontend' / 'dist'),
    ]

    for remote_rel, local_path in targets:
        remote_path = f'{REMOTE_ROOT}/{remote_rel}'
        log(f'Syncing {remote_rel}...')
        try:
            st = sftp.stat(remote_path)
        except FileNotFoundError:
            log(f'  missing on server: {remote_rel}')
            continue
        if st.st_mode & 0o40000:
            if local_path.exists():
                shutil.rmtree(local_path)
            sftp_sync_tree(sftp, remote_path, local_path)
        else:
            local_path.parent.mkdir(parents=True, exist_ok=True)
            sftp.get(remote_path, str(local_path))

    sftp.close()
    client.close()


def prepare_git():
    git_dir = REPO_DIR / '.git'
    if git_dir.exists():
        shutil.rmtree(git_dir)

    run(['git', 'init', '-b', 'main'], cwd=REPO_DIR)
    run(['git', 'add', '-A'], cwd=REPO_DIR)
    result = run(['git', 'status', '--short'], cwd=REPO_DIR)
    log(f'Files staged: {len(result.stdout.splitlines())}')
    run([
        'git', '-c', 'user.name=12Jubayer', '-c', 'user.email=12Jubayer@users.noreply.github.com',
        'commit', '-m', 'Full Jowabuzz project from production server'
    ], cwd=REPO_DIR)
    run(['git', 'remote', 'remove', 'origin'], cwd=REPO_DIR, check=False)
    run(['git', 'remote', 'add', 'origin', GITHUB_REPO], cwd=REPO_DIR)


def push_github():
    token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    if token:
        run(['git', 'remote', 'set-url', 'origin', f'https://{token}@github.com/12Jubayer/20tarik.git'], cwd=REPO_DIR)

    gh_paths = [
        r'C:\Program Files\GitHub CLI\gh.exe',
        'gh',
    ]
    gh = next((p for p in gh_paths if shutil.which(p) or Path(p).exists()), None)

    env = os.environ.copy()
    env['GCM_INTERACTIVE'] = 'Always'
    env['GIT_TERMINAL_PROMPT'] = '1'

    result = subprocess.run(
        ['git', 'push', '-u', 'origin', 'main', '--force'],
        cwd=REPO_DIR, text=True, capture_output=True, env=env
    )
    log(result.stdout)
    log(result.stderr)
    if result.returncode == 0:
        log('SUCCESS: ' + GITHUB_REPO)
        return

    if gh:
        log('Trying gh auth git credential...')
        auth = subprocess.run([gh, 'auth', 'status'], text=True, capture_output=True)
        log(auth.stdout + auth.stderr)
        if auth.returncode != 0:
            log('Run: gh auth login')
            raise RuntimeError('GitHub login required. Open terminal and run: gh auth login')

    raise RuntimeError('git push failed')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    log('Project: ' + str(REPO_DIR))
    sync_from_server()
    prepare_git()
    push_github()
