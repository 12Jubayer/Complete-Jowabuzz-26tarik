const AGENT_TOKEN_KEY = 'agentToken';
const CURRENT_AGENT_KEY = 'currentAgent';

export function getAgentToken() {
  return localStorage.getItem(AGENT_TOKEN_KEY);
}

export function getCurrentAgent() {
  try {
    const raw = localStorage.getItem(CURRENT_AGENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAgentAuthenticated() {
  return !!getAgentToken() && !!getCurrentAgent();
}

export function setAgentSession({ agent, token }) {
  localStorage.setItem(AGENT_TOKEN_KEY, token);
  localStorage.setItem(CURRENT_AGENT_KEY, JSON.stringify(agent));
}

export function clearAgentSession() {
  localStorage.removeItem(AGENT_TOKEN_KEY);
  localStorage.removeItem(CURRENT_AGENT_KEY);
}

export default {
  getAgentToken,
  getCurrentAgent,
  isAgentAuthenticated,
  setAgentSession,
  clearAgentSession,
};
