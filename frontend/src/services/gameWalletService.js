import { getUserToken } from '../utils/userAuth';



const LAUNCH_TIMEOUT_MS = 30000;



function authHeaders() {

  const token = getUserToken();

  if (!token) throw new Error('Please login to play');

  return {

    Accept: 'application/json',

    Authorization: `Bearer ${token}`,

    'Content-Type': 'application/json',

  };

}



async function fetchWithTimeout(url, options = {}, timeoutMs = LAUNCH_TIMEOUT_MS) {

  const controller = new AbortController();

  const timer = window.setTimeout(() => controller.abort(), timeoutMs);



  try {

    return await fetch(url, { ...options, signal: controller.signal });

  } catch (error) {

    if (error?.name === 'AbortError') {

      throw new Error('Game launch timed out. Please try again.');

    }

    throw error;

  } finally {

    window.clearTimeout(timer);

  }

}



async function parseError(response) {

  const body = await response.json().catch(() => ({}));

  throw new Error(body.error || `Request failed (${response.status})`);

}



export async function fetchLiveBalance() {

  const response = await fetch('/api/user/balance', { headers: authHeaders() });

  if (response.status === 401) throw new Error('Session expired. Please login again.');

  if (!response.ok) await parseError(response);

  return response.json();

}



export async function lookupGameByCode(code) {

  const response = await fetchWithTimeout(`/api/game/lookup/${encodeURIComponent(code)}`, {

    headers: authHeaders(),

  });

  if (!response.ok) await parseError(response);

  return response.json();

}



export async function startGameSession({ gameId, providerId }) {

  const response = await fetchWithTimeout('/api/game/start', {

    method: 'POST',

    headers: authHeaders(),

    body: JSON.stringify({ gameId, providerId }),

  });

  if (response.status === 401) throw new Error('Session expired. Please login again.');

  if (!response.ok) await parseError(response);

  return response.json();

}



export async function submitGameResult(payload) {

  const response = await fetch('/api/game/result', {

    method: 'POST',

    headers: authHeaders(),

    body: JSON.stringify(payload),

  });

  if (!response.ok) await parseError(response);

  return response.json();

}



function openGameUrl(launchUrl, options = {}) {
  const mode = String(options.openMode || '').toLowerCase();
  const useSameTab = mode === 'replace' || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (useSameTab) {
    window.location.assign(launchUrl);
    return;
  }
  const popup = window.open(launchUrl, '_blank', 'noopener,noreferrer');
  if (!popup) {
    window.location.assign(launchUrl);
  }
}

const launchSlots = new Map();

const LAUNCH_SLOT_TTL_MS = 120000;

function isSpribeGameLaunch({ providerCode, gameName, launchUrl } = {}) {
  const provider = String(providerCode || '').trim().toUpperCase();
  const name = String(gameName || '').trim().toLowerCase();
  const url = String(launchUrl || '');
  return provider === 'SPRIBE' || name.includes('aviator') || url.includes('spribegaming.com');
}



export async function launchOracleGame({ gameId, providerId, gameCode }) {

  let resolvedGameId = gameId;

  let resolvedProviderId = providerId;
  let resolvedProviderCode = '';
  let resolvedGameName = gameCode || '';



  if (gameCode) {

    const lookup = await lookupGameByCode(gameCode);

    const lookupGameId = Number(lookup.gameId ?? lookup.id);

    const lookupProviderId = Number(lookup.providerId);

    if (lookupGameId) resolvedGameId = lookupGameId;

    if (lookupProviderId) resolvedProviderId = lookupProviderId;
    if (lookup.providerCode) resolvedProviderCode = String(lookup.providerCode).toUpperCase();
    if (lookup.gameName) resolvedGameName = String(lookup.gameName);

  }



  if (!resolvedGameId || !resolvedProviderId) {

    throw new Error('Game information is incomplete. Please refresh and try again.');

  }



  const slotKey = `launch:${resolvedGameId}:${resolvedProviderId}`;

  const spribeLaunch = isSpribeGameLaunch({
    providerCode: resolvedProviderCode,
    gameName: resolvedGameName || gameCode,
  });

  if (!spribeLaunch && launchSlots.has(slotKey)) {

    return launchSlots.get(slotKey);

  }



  const task = (async () => {

    const start = await startGameSession({

      gameId: resolvedGameId,

      providerId: resolvedProviderId,

    });



    const launchUrl = start.launchUrl || start.launch?.launchUrl;

    if (!launchUrl || typeof launchUrl !== 'string') {

      throw new Error('Game launch URL not received. Please try again in a moment.');

    }



    if (start.skipOpen) {
      return start;
    }

    const spribeLaunch = isSpribeGameLaunch({
      providerCode: start.provider?.code,
      gameName: start.game?.name,
      launchUrl,
    });

    openGameUrl(launchUrl, { openMode: start.openMode || (spribeLaunch ? 'replace' : 'popup') });

    return start;

  })();



  if (!spribeLaunch) launchSlots.set(slotKey, task);

  try {

    return await task;

  } finally {

    if (!spribeLaunch) window.setTimeout(() => launchSlots.delete(slotKey), LAUNCH_SLOT_TTL_MS);

  }

}



export async function playGameRound({ gameId, providerId, betAmount, gameCode }) {

  return launchOracleGame({ gameId, providerId, gameCode });

}



export default {

  fetchLiveBalance,

  lookupGameByCode,

  startGameSession,

  submitGameResult,

  launchOracleGame,

  playGameRound,

};

