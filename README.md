# Jowabuzz (JB)

Full Jowabuzz.com casino platform repository.

## Project Structure

| Folder | Description |
|---|---|
| `frontend/` | React + Vite production app (jowabuzz.com UI) |
| `backend/` | Express API server (auth, wallet, games, admin) |
| `sobuj/` | Legacy mega-baji monolith (EJS + Express) |
| `scripts/jowabuzz-fix/` | Deployment patches and hotfixes |
| `uploadfile/` | Static upload assets |

## Quick Start (Jowabuzz)

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run build
```

## Server Paths (Production)
- Frontend: `/www/wwwroot/jowabuzz/frontend`
- Backend: `/www/wwwroot/jowabuzz/backend`
- PM2 process: `jowabuzz`

## Notes
- `.env`, `node_modules`, `dist`, and `uploads` are not committed.
- Deploy credentials: copy `scripts/deploy-secrets.ps1.example` to `scripts/deploy-secrets.ps1`.
