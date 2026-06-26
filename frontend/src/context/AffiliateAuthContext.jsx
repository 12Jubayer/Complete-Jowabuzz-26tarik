import { createContext, useContext, useMemo, useState } from 'react';
import { logoutAffiliate } from '../services/affiliateAuthService';
import { getCurrentAffiliate, isAffiliateAuthenticated } from '../utils/affiliateAuth';

const AffiliateAuthContext = createContext(null);

export function AffiliateAuthProvider({ children }) {
  const [affiliate, setAffiliate] = useState(() => getCurrentAffiliate());
  const [authenticated, setAuthenticated] = useState(() => isAffiliateAuthenticated());

  const value = useMemo(
    () => ({
      affiliate,
      authenticated,
      login: (affiliateData) => {
        setAffiliate(affiliateData);
        setAuthenticated(true);
      },
      logout: async () => {
        await logoutAffiliate();
        setAffiliate(null);
        setAuthenticated(false);
      },
    }),
    [affiliate, authenticated],
  );

  return (
    <AffiliateAuthContext.Provider value={value}>{children}</AffiliateAuthContext.Provider>
  );
}

export function useAffiliateAuth() {
  const context = useContext(AffiliateAuthContext);
  if (!context) {
    throw new Error('useAffiliateAuth must be used within AffiliateAuthProvider');
  }
  return context;
}
