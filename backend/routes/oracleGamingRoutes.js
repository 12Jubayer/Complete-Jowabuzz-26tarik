import { Router } from 'express';
import { postOracleCallback, postOracleRefund } from '../controllers/gamingApiSettingsController.js';
import { FIXED_CALLBACK_URL, getGamingGatewaySettingsInternal } from '../services/gamingGatewayService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

async function callbackInfo(req, res) {
  try {
    const settings = await getGamingGatewaySettingsInternal();
    return res.json({
      ok: true,
      endpoint: 'oracle-wallet-callback',
      callbackUrl: settings.callbackUrl || FIXED_CALLBACK_URL,
      methods: ['GET', 'POST'],
    });
  } catch {
    return res.json({
      ok: true,
      endpoint: 'oracle-wallet-callback',
      callbackUrl: FIXED_CALLBACK_URL,
      methods: ['GET', 'POST'],
    });
  }
}

async function getDebugLogs(req, res) {
  try {
    const userId = Number(req.query.userId || 0);
    const username = String(req.query.username || '').trim();

    if (!userId && !username) {
      return res.status(400).json({ error: 'userId or username is required' });
    }

    const targetUsername1 = username;
    const targetUsername2 = userId ? `player_${userId}` : '';
    const targetUsername3 = userId ? `player-${userId}` : '';

    const matchUser = (name) => {
      if (!name) return false;
      const clean = String(name).trim().toLowerCase();
      if (username && clean === username.toLowerCase()) return true;
      if (targetUsername2 && clean === targetUsername2.toLowerCase()) return true;
      if (targetUsername3 && clean === targetUsername3.toLowerCase()) return true;
      if (userId && clean === String(userId)) return true;
      return false;
    };

    const logsDir = path.join(__dirname, '..', 'logs');
    const callbackLogPath = path.join(logsDir, 'gaming-callback.log');
    const allRequestsLogPath = path.join(logsDir, 'all-requests.log');

    let callbackLogs = [];
    if (fs.existsSync(callbackLogPath)) {
      const data = fs.readFileSync(callbackLogPath, 'utf8');
      const lines = data.split('\n').filter(Boolean);
      const lastLines = lines.slice(-200);
      for (const line of lastLines) {
        try {
          const parsed = JSON.parse(line);
          const userKey = parsed.usernamePlayerId || parsed.username || parsed.playerId || parsed.exactPayload?.username || parsed.responseBody?.username;
          if (matchUser(userKey) || (userId && parsed.matchedUserId === userId)) {
            callbackLogs.push(parsed);
          }
        } catch {
          // ignore
        }
      }
    }

    let allRequestLogs = [];
    if (fs.existsSync(allRequestsLogPath)) {
      const data = fs.readFileSync(allRequestsLogPath, 'utf8');
      const lines = data.split('\n').filter(Boolean);
      const lastLines = lines.slice(-150);
      for (const line of lastLines) {
        if (line.includes('/oracle/callback') || line.includes('/callback')) {
          allRequestLogs.push(line);
        }
      }
    }

    let gatewaySettings = null;
    try {
      gatewaySettings = await getGamingGatewaySettingsInternal();
    } catch (err) {
      gatewaySettings = { error: err.message };
    }

    return res.json({
      success: true,
      callbackLogs: callbackLogs.slice(-20), // return last 20 matching logs
      allRequestLogs: allRequestLogs.slice(-15),
      gatewaySettings: gatewaySettings ? {
        providerName: gatewaySettings.providerName,
        providerStatus: gatewaySettings.providerStatus,
        apiMode: gatewaySettings.apiMode,
        callbackUrl: gatewaySettings.callbackUrl || FIXED_CALLBACK_URL,
        currency: gatewaySettings.currency,
      } : null,
    });
  } catch (error) {
    console.error('Debug logs error:', error);
    return res.status(500).json({ error: error.message });
  }
}

const callbackPaths = [
  '/oracle/callback',
  '/oracle/refund',
  '/wallet/callback',
  '/gaming/callback',
  '/seamless/callback',
  '/getbalance',
  '/balance',
];

router.get('/oracle/callback/info', callbackInfo);
router.get('/oracle/debug-session', getDebugLogs);
router.get('/oracle/callback', postOracleCallback);
router.post('/oracle/callback', postOracleCallback);
router.post('/oracle/refund', postOracleRefund);

for (const routePath of callbackPaths) {
  if (routePath === '/oracle/callback' || routePath === '/oracle/refund') continue;
  router.get(routePath, postOracleCallback);
  router.post(routePath, postOracleCallback);
}

export default router;
