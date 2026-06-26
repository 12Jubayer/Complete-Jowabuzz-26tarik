import { createContext, useContext, useMemo, useState } from 'react';
import { logoutAgent } from '../services/agentAuthService';
import { getCurrentAgent, isAgentAuthenticated } from '../utils/agentAuth';

const AgentAuthContext = createContext(null);

export function AgentAuthProvider({ children }) {
  const [agent, setAgent] = useState(() => getCurrentAgent());
  const [authenticated, setAuthenticated] = useState(() => isAgentAuthenticated());

  const value = useMemo(
    () => ({
      agent,
      authenticated,
      login: (agentData) => {
        setAgent(agentData);
        setAuthenticated(true);
      },
      logout: async () => {
        await logoutAgent();
        setAgent(null);
        setAuthenticated(false);
      },
    }),
    [agent, authenticated],
  );

  return (
    <AgentAuthContext.Provider value={value}>{children}</AgentAuthContext.Provider>
  );
}

export function useAgentAuth() {
  const context = useContext(AgentAuthContext);

  if (!context) {
    throw new Error('useAgentAuth must be used within AgentAuthProvider');
  }

  return context;
}
