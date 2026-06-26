import { adminFetch, AdminSessionExpiredError, getAdminAuthHeaders } from '../utils/adminApi';

import {

  clearAdminSession,

  getAdminToken,

  getAdminUser,

  isAdminAuthenticated,

  setAdminSession,

} from '../utils/adminAuth';



export { AdminSessionExpiredError };



export async function loginAdmin({ email, password }) {

  const trimmedEmail = email.trim();



  if (!trimmedEmail) {

    return { success: false, error: 'Email is required' };

  }



  if (!password) {

    return { success: false, error: 'Password is required' };

  }



  try {

    const response = await fetch('/api/admin/login', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ email: trimmedEmail, password }),

    });



    const data = await response.json().catch(() => ({}));



    if (!response.ok) {

      return {

        success: false,

        error: data.error || 'Invalid email or password',

      };

    }



    const user = {

      id: data.user.id,

      email: data.user.email,

      name: data.user.name,

      role: data.user.role,

      permissions: data.user.permissions || {},

    };



    setAdminSession(user, data.token);



    return {

      success: true,

      user,

      token: data.token,

    };

  } catch {

    return {

      success: false,

      error: 'Unable to connect to server. Please try again.',

    };

  }

}



export async function verifyAdminSession() {

  if (!isAdminAuthenticated()) {

    return { success: false, expired: true };

  }



  try {

    const response = await adminFetch('/api/admin/me', {

      headers: getAdminAuthHeaders(),

    });



    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (response.status === 403) {
        clearAdminSession();
        return { success: false, expired: true, error: body.error || 'Admin session blocked' };
      }
      return { success: false, error: body.error || 'Unable to verify admin session' };
    }



    const data = await response.json();

    const token = getAdminToken();

    const user = {

      id: data.user.id,

      email: data.user.email,

      name: data.user.name,

      role: data.user.role,

      permissions: data.user.permissions || {},

    };



    if (token) {

      setAdminSession(user, token);

    }



    return {

      success: true,

      user,

    };

  } catch (error) {

    if (error instanceof AdminSessionExpiredError) {

      return { success: false, expired: true };

    }



    return { success: false, error: error.message || 'Unable to verify admin session' };

  }

}



export async function logoutAdmin() {

  clearAdminSession();

  return { success: true };

}



export function checkAdminAuth() {

  return isAdminAuthenticated();

}



export default loginAdmin;

