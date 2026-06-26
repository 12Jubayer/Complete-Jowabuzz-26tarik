import { clearUserToken, setUserToken, setRefreshToken, getUserToken } from './userAuth';

const USERS_KEY = 'jowabuzz_users';
const RESET_OTP_KEY = 'jowabuzz_reset_otp';
const AUTH_TOKEN_KEY = 'authToken';
const CURRENT_USER_KEY = 'currentUser';

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function normalizePhone(phone = '') {
  return phone.replace(/\D/g, '');
}

function generateReferralCode(username = 'USER') {
  const prefix = username.replace(/\s/g, '').slice(0, 3).toUpperCase() || 'JB';
  return `JB${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
}

function generateAuthToken(userId) {
  return `jb_token_${userId}_${Date.now()}`;
}

function enrichUser(user) {
  return {
    ...user,
    balance: user.balance ?? 0,
    referralCode: user.referralCode ?? generateReferralCode(user.username),
    currency: user.currency ?? 'BDT',
  };
}

function findUserIndexByIdentifier(users, identifier) {
  const value = identifier.trim();
  const lowerValue = value.toLowerCase();
  const phoneValue = normalizePhone(value);

  return users.findIndex(
    (user) =>
      user.username.toLowerCase() === lowerValue ||
      normalizePhone(user.phone) === phoneValue,
  );
}

export function findUserByIdentifier(identifier) {
  const users = getUsers();
  const index = findUserIndexByIdentifier(users, identifier.trim());
  return index === -1 ? null : users[index];
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!localStorage.getItem(AUTH_TOKEN_KEY) && !!getCurrentUser();
}

export function setSession(user, token = null) {
  const sessionUser = enrichUser(user);
  localStorage.setItem(AUTH_TOKEN_KEY, generateAuthToken(sessionUser.id));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
  if (token) {
    setUserToken(token);
  }
  return sessionUser;
}

export function persistAuthTokens(token, refreshToken = null) {
  if (token) setUserToken(token);
  if (refreshToken) setRefreshToken(refreshToken);
}

export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem('token');
  localStorage.removeItem('userToken');
  localStorage.removeItem('authToken');
  clearUserToken();
}

function getResetOtpRecord() {
  try {
    const raw = localStorage.getItem(RESET_OTP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveResetOtpRecord(record) {
  localStorage.setItem(RESET_OTP_KEY, JSON.stringify(record));
}

function clearResetOtpRecord() {
  localStorage.removeItem(RESET_OTP_KEY);
}

function generateOtp() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function maskPhone(phone = '') {
  const digits = normalizePhone(phone);
  if (digits.length <= 4) return digits;
  return `+880 ******${digits.slice(-4)}`;
}

export async function registerUser({
  username,
  phone,
  password,
  confirmPassword,
  currency = 'BDT',
  referCode = '',
}) {
  const trimmedUsername = username.trim();
  const normalizedPhone = normalizePhone(phone);

  if (!trimmedUsername) {
    return { success: false, error: 'Username is required' };
  }

  if (!normalizedPhone) {
    return { success: false, error: 'Phone number is required' };
  }

  if (!password) {
    return { success: false, error: 'Password is required' };
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match' };
  }

  const syncResult = await syncUserToBackend({
    username: trimmedUsername,
    phone: normalizedPhone,
    password,
    referCode: referCode.trim(),
  });

  if (!syncResult.success) {
    return { success: false, error: syncResult.error || 'Registration failed on server' };
  }

  const users = getUsers().filter(
    (user) =>
      user.username.toLowerCase() !== trimmedUsername.toLowerCase()
      && normalizePhone(user.phone) !== normalizedPhone,
  );

  const newUser = enrichUser({
    id: syncResult.user?.id ? String(syncResult.user.id) : `${Date.now()}`,
    username: trimmedUsername,
    phone: normalizedPhone,
    password,
    currency,
    referCode: referCode.trim(),
    createdAt: new Date().toISOString(),
  });

  if (syncResult.user?.id) {
    newUser.id = String(syncResult.user.id);
    newUser.dbId = syncResult.user.id;
    if (syncResult.user.providerUsername) {
      newUser.providerUsername = syncResult.user.providerUsername;
    }
    if (syncResult.user.referralCode) {
      newUser.referralCode = syncResult.user.referralCode;
    }
    persistAuthTokens(syncResult.token, syncResult.refreshToken);
  }

  saveUsers([...users, newUser]);

  return {
    success: true,
    user: newUser,
    token: syncResult.token ?? null,
    refreshToken: syncResult.refreshToken ?? null,
  };
}
export async function loginUser({ username, password }) {
  const trimmedUsername = username.trim();

  if (!trimmedUsername) {
    return { success: false, error: 'Username is required' };
  }

  if (!password) {
    return { success: false, error: 'Password is required' };
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: trimmedUsername, password }),
    });

    const body = await response.json().catch(() => ({}));

    if (response.ok && body.success) {
      const apiUser = {
        id: String(body.user.id),
        dbId: body.user.id,
        username: body.user.username || body.user.name,
        name: body.user.name,
        phone: body.user.phone,
        providerUsername: body.user.providerUsername,
        balance: body.user.balance,
        referralCode: body.user.referralCode,
        currency: 'BDT',
      };

      setUserToken(body.token);
      if (body.refreshToken) setRefreshToken(body.refreshToken);
      setSession(apiUser, body.token);

      const users = getUsers();
      const index = users.findIndex(
        (item) =>
          item.username.toLowerCase() === apiUser.username.toLowerCase() ||
          normalizePhone(item.phone) === normalizePhone(apiUser.phone),
      );
      if (index >= 0) {
        users[index] = { ...users[index], ...apiUser, password };
        saveUsers(users);
      }

      return { success: true, user: apiUser, token: body.token, refreshToken: body.refreshToken };
    }

    if (body.error && response.status !== 401) {
      return { success: false, error: body.error };
    }
  } catch {
    // fallback to local login below
  }

  const users = getUsers();
  const user = users.find(
    (item) =>
      item.username.toLowerCase() === trimmedUsername.toLowerCase() &&
      item.password === password,
  );

  if (!user) {
    return { success: false, error: 'Invalid username or password' };
  }

  return { success: true, user: enrichUser(user) };
}

export function sendResetOtp(identifier) {
  const trimmedIdentifier = identifier.trim();

  if (!trimmedIdentifier) {
    return { success: false, error: 'Phone number or username is required' };
  }

  const user = findUserByIdentifier(trimmedIdentifier);

  if (!user) {
    return { success: false, error: 'User not found. Please sign up first.' };
  }

  const existingOtp = getResetOtpRecord();

  if (
    existingOtp?.userId === user.id &&
    Date.now() - existingOtp.sentAt < OTP_RESEND_COOLDOWN_MS
  ) {
    const waitSeconds = Math.ceil(
      (OTP_RESEND_COOLDOWN_MS - (Date.now() - existingOtp.sentAt)) / 1000,
    );
    return {
      success: false,
      error: `Please wait ${waitSeconds}s before requesting a new OTP`,
    };
  }

  const otp = generateOtp();
  const record = {
    userId: user.id,
    identifier: trimmedIdentifier,
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    sentAt: Date.now(),
    verified: false,
  };

  saveResetOtpRecord(record);

  return {
    success: true,
    otp,
    maskedPhone: maskPhone(user.phone),
    expiresIn: OTP_EXPIRY_MS / 1000,
  };
}

export function verifyResetOtp(identifier, otpValue) {
  const trimmedIdentifier = identifier.trim();
  const trimmedOtp = otpValue.trim();

  if (!trimmedIdentifier) {
    return { success: false, error: 'Phone number or username is required' };
  }

  if (!trimmedOtp) {
    return { success: false, error: 'OTP is required' };
  }

  if (!/^\d{6}$/.test(trimmedOtp)) {
    return { success: false, error: 'OTP must be 6 digits' };
  }

  const user = findUserByIdentifier(trimmedIdentifier);

  if (!user) {
    return { success: false, error: 'User not found. Please sign up first.' };
  }

  const record = getResetOtpRecord();

  if (!record || record.userId !== user.id) {
    return { success: false, error: 'Please request an OTP first' };
  }

  if (Date.now() > record.expiresAt) {
    clearResetOtpRecord();
    return { success: false, error: 'OTP expired. Please request a new one.' };
  }

  if (record.otp !== trimmedOtp) {
    return { success: false, error: 'Invalid OTP. Please try again.' };
  }

  saveResetOtpRecord({ ...record, verified: true });

  return { success: true };
}

export function resetPassword({ identifier, newPassword, confirmPassword }) {
  const trimmedIdentifier = identifier.trim();

  if (!trimmedIdentifier) {
    return { success: false, error: 'Phone number or username is required' };
  }

  if (!newPassword) {
    return { success: false, error: 'New password is required' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Passwords do not match' };
  }

  const users = getUsers();
  const userIndex = findUserIndexByIdentifier(users, trimmedIdentifier);

  if (userIndex === -1) {
    return { success: false, error: 'User not found. Please sign up first.' };
  }

  const user = users[userIndex];
  const record = getResetOtpRecord();

  if (!record || record.userId !== user.id || !record.verified) {
    return { success: false, error: 'Please verify OTP before resetting password' };
  }

  if (Date.now() > record.expiresAt) {
    clearResetOtpRecord();
    return { success: false, error: 'OTP session expired. Please start again.' };
  }

  const updatedUsers = [...users];
  updatedUsers[userIndex] = {
    ...updatedUsers[userIndex],
    password: newPassword,
    updatedAt: new Date().toISOString(),
  };

  saveUsers(updatedUsers);
  clearResetOtpRecord();

  return { success: true };
}

export function getResetOtpCooldown(identifier) {
  const user = findUserByIdentifier(identifier.trim());
  if (!user) return 0;

  const record = getResetOtpRecord();
  if (!record || record.userId !== user.id) return 0;

  const remaining = OTP_RESEND_COOLDOWN_MS - (Date.now() - record.sentAt);
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

async function syncUserToBackend({ username, phone, password, referCode = '' }) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: username,
        phone,
        password,
        ref: referCode,
        referCode,
      }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, error: body.error || 'Registration failed on server' };
    }

    return {
      success: true,
      user: body.user ?? null,
      token: body.token ?? null,
      refreshToken: body.refreshToken ?? null,
    };
  } catch {
    return { success: false, error: 'Unable to connect to server' };
  }
}