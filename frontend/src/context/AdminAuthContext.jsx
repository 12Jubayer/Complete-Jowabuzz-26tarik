import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { logoutAdmin, verifyAdminSession } from '../services/adminAuthService';

import { clearAdminSession, getAdminUser, isAdminAuthenticated } from '../utils/adminAuth';

import {

  hasAdminPermission,

  hasAnyAdminPermission,

  isSuperAdmin,

} from '../utils/adminPermissions';



const AdminAuthContext = createContext(null);



export function AdminAuthProvider({ children }) {

  const [admin, setAdmin] = useState(() => getAdminUser());

  const [authenticated, setAuthenticated] = useState(() => isAdminAuthenticated());

  const [bootstrapped, setBootstrapped] = useState(false);



  useEffect(() => {

    let active = true;



    async function bootstrapSession() {

      if (!isAdminAuthenticated()) {

        if (active) {

          setAuthenticated(false);

          setAdmin(null);

          setBootstrapped(true);

        }

        return;

      }



      let finished = false;

      const finish = (handler) => {

        if (!active || finished) return;

        finished = true;

        handler();

        setBootstrapped(true);

      };



      const timeoutId = window.setTimeout(() => {

        finish(() => {

          clearAdminSession();

          setAdmin(null);

          setAuthenticated(false);

        });

      }, 8000);



      try {

        const result = await verifyAdminSession();



        window.clearTimeout(timeoutId);



        if (!active) return;



        if (result.success) {

          finish(() => {

            setAdmin(result.user);

            setAuthenticated(true);

          });

          return;

        }



        finish(() => {

          clearAdminSession();

          setAdmin(null);

          setAuthenticated(false);

        });

      } catch {

        window.clearTimeout(timeoutId);

        finish(() => {

          clearAdminSession();

          setAdmin(null);

          setAuthenticated(false);

        });

      }

    }



    bootstrapSession();



    return () => {

      active = false;

    };

  }, []);



  const value = useMemo(

    () => ({

      admin,

      authenticated,

      bootstrapped,

      isSuperAdmin: isSuperAdmin(admin),

      hasPermission: (permissionKey) => hasAdminPermission(admin, permissionKey),

      hasAnyPermission: (permissionKeys) => hasAnyAdminPermission(admin, permissionKeys),

      login: (user) => {

        setAdmin(user);

        setAuthenticated(true);

      },

      logout: async () => {

        await logoutAdmin();

        setAdmin(null);

        setAuthenticated(false);

      },

    }),

    [admin, authenticated, bootstrapped],

  );



  return (

    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>

  );

}



export function useAdminAuth() {

  const context = useContext(AdminAuthContext);



  if (!context) {

    throw new Error('useAdminAuth must be used within AdminAuthProvider');

  }



  return context;

}

