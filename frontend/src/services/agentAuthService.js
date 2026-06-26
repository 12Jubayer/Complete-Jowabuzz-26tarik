import {
  clearAgentSession,
  getCurrentAgent,
  isAgentAuthenticated,
  setAgentSession,
} from '../utils/agentAuth';

export async function loginAgent({ loginId, password }) {
  const safeLoginId = String(loginId || '').trim();

  if (!safeLoginId) {
    return { success: false, error: 'User ID is required' };
  }

  if (!password) {
    return { success: false, error: 'Password is required' };
  }

  try {
    const response = await fetch('/api/agent/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: safeLoginId, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Invalid user ID or password',
      };
    }

    setAgentSession({ agent: data.agent, token: data.token });

    return {
      success: true,
      agent: getCurrentAgent(),
      token: data.token,
    };
  } catch {
    return {
      success: false,
      error: 'Unable to connect to server. Please try again.',
    };
  }
}

export async function logoutAgent() {
  clearAgentSession();
  return { success: true };
}

export function checkAgentAuth() {
  return isAgentAuthenticated();
}

export default loginAgent;
