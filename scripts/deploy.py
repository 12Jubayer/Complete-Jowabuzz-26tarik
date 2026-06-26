#!/usr/bin/env python3
"""Deploy Jowabuzz project to server via SSH/SFTP."""
import os
import sys
import tarfile
import zipfile
import tempfile
import shutil
import subprocess
from pathlib import Path

import paramiko

HOST = "103.165.10.242"
USERNAME = "root"
PASSWORD = "Jowabuzz@12"
PORT = 22

REMOTE_BACKEND = "/www/wwwroot/jowabuzz/backend"
REMOTE_FRONTEND = "/www/wwwroot/jowabuzz/frontend"
PM2_NAME = "jowabuzz"

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"

BACKEND_EXCLUDES = {
    "node_modules", "uploads", ".env", ".git",
}
BACKEND_EXCLUDE_SUFFIXES = (".zip", ".tar.gz")


def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    return client


def run(client, cmd, check=True):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=600)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out:
        print(out.rstrip().encode("ascii", errors="replace").decode("ascii"))
    if err:
        print(err.rstrip().encode("ascii", errors="replace").decode("ascii"), file=sys.stderr)
    if check and code != 0:
        raise RuntimeError(f"Command failed ({code}): {cmd}")
    return code, out, err


def probe(client):
    print("=== Server probe ===")
    run(client, "uname -a", check=False)
    run(client, "node -v 2>/dev/null || echo 'node missing'", check=False)
    run(client, "npm -v 2>/dev/null || echo 'npm missing'", check=False)
    run(client, "pm2 list 2>/dev/null || echo 'pm2 missing'", check=False)
    run(client, f"ls -la {REMOTE_BACKEND}/ 2>/dev/null | head -20", check=False)
    run(client, f"test -f {REMOTE_BACKEND}/.env && echo '.env exists' || echo '.env missing'", check=False)
    run(client, f"ls -la {REMOTE_FRONTEND}/ 2>/dev/null | head -10", check=False)


def create_backend_tar():
    fd, path = tempfile.mkstemp(suffix=".tar.gz")
    os.close(fd)
    print(f"Creating backend archive: {path}")
    with tarfile.open(path, "w:gz") as tar:
        for item in BACKEND_DIR.rglob("*"):
            rel = item.relative_to(BACKEND_DIR)
            parts = rel.parts
            if parts and parts[0] in BACKEND_EXCLUDES:
                continue
            if any(str(rel).endswith(s) for s in BACKEND_EXCLUDE_SUFFIXES):
                continue
            if "scripts" in parts and item.name == "deploy-probe.mjs":
                continue
            if item.is_file():
                tar.add(item, arcname=str(rel).replace("\\", "/"))
    return path


def upload_file(sftp, local_path, remote_path):
    print(f"Uploading {local_path} -> {remote_path}")
    sftp.put(local_path, remote_path)


def deploy_backend(client, sftp):
    print("\n=== Deploying backend ===")
    tar_path = create_backend_tar()
    remote_tar = "/tmp/jowabuzz-backend-deploy.tar.gz"
    try:
        upload_file(sftp, tar_path, remote_tar)
        # Preserve .env and uploads - extract without deleting them first
        cmds = [
            f'mkdir -p "{REMOTE_BACKEND}"',
            f'cd "{REMOTE_BACKEND}" && tar -xzf "{remote_tar}"',
            f'rm -f "{remote_tar}"',
            f'cd "{REMOTE_BACKEND}" && npm install --production',
            f'pm2 reload {PM2_NAME} 2>/dev/null || pm2 restart {PM2_NAME} 2>/dev/null || (cd "{REMOTE_BACKEND}" && pm2 start server.js --name {PM2_NAME})',
            "pm2 save 2>/dev/null || true",
        ]
        run(client, " && ".join(cmds))
    finally:
        os.unlink(tar_path)


def find_frontend_dist():
    dist = FRONTEND_DIR / "dist"
    if dist.is_dir() and any(dist.iterdir()):
        return dist
    dist_zip = FRONTEND_DIR / "dist.zip"
    if dist_zip.is_file():
        return dist_zip
    return None


def create_frontend_zip_from_dist():
    dist = FRONTEND_DIR / "dist"
    fd, path = tempfile.mkstemp(suffix=".zip")
    os.close(fd)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in dist.rglob("*"):
            if f.is_file():
                zf.write(f, f.relative_to(dist).as_posix())
    return path


def deploy_frontend(client, sftp):
    print("\n=== Deploying frontend ===")
    source = find_frontend_dist()
    if source is None:
        raise RuntimeError("No frontend dist/ or dist.zip found. Build frontend first.")

    if source.suffix == ".zip":
        zip_path = str(source)
        cleanup = False
    else:
        zip_path = create_frontend_zip_from_dist()
        cleanup = True

    remote_zip = "/tmp/jowabuzz-frontend-deploy.zip"
    try:
        upload_file(sftp, zip_path, remote_zip)
        cmds = [
            f'mkdir -p "{REMOTE_FRONTEND}"',
            f'rm -rf "{REMOTE_FRONTEND}"/*',
            f'unzip -o "{remote_zip}" -d "{REMOTE_FRONTEND}" || [ $? -eq 1 ]',
            f'rm -f "{remote_zip}"',
            f'ls -la "{REMOTE_FRONTEND}" | head -15',
        ]
        run(client, " && ".join(cmds))
    finally:
        if cleanup:
            os.unlink(zip_path)


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "full"
    client = connect()
    print(f"Connected to {HOST}")
    try:
        sftp = client.open_sftp()
        try:
            probe(client)
            if action in ("backend", "full"):
                deploy_backend(client, sftp)
            if action in ("frontend", "full"):
                deploy_frontend(client, sftp)
            print("\n=== Deployment complete ===")
            run(client, "pm2 list", check=False)
        finally:
            sftp.close()
    finally:
        client.close()


if __name__ == "__main__":
    main()
