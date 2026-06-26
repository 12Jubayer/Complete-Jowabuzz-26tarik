const ADMIN_TOKEN_KEY = 'adminToken';

const ADMIN_USER_KEY = 'adminUser';



export function getAdminToken() {

  return localStorage.getItem(ADMIN_TOKEN_KEY);

}



export function getAdminUser() {

  try {

    const raw = localStorage.getItem(ADMIN_USER_KEY);

    return raw ? JSON.parse(raw) : null;

  } catch {

    return null;

  }

}



export function isAdminAuthenticated() {

  return !!getAdminToken();

}



export function setAdminSession(user, token) {

  localStorage.setItem(ADMIN_TOKEN_KEY, token);

  localStorage.setItem(

    ADMIN_USER_KEY,

    JSON.stringify({

      id: user.id,

      email: user.email,

      name: user.name,

      role: user.role || 'admin',

      permissions: user.permissions || {},

    }),

  );

}



export function clearAdminSession() {

  localStorage.removeItem(ADMIN_TOKEN_KEY);

  localStorage.removeItem(ADMIN_USER_KEY);

}



export default {

  getAdminToken,

  getAdminUser,

  isAdminAuthenticated,

  setAdminSession,

  clearAdminSession,

};

