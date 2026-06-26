async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function requestForgotPasswordOtp(identifier) {
  const response = await fetch('/api/auth/forgot-password/request-otp', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function verifyForgotPasswordOtp(identifier, otp) {
  const response = await fetch('/api/auth/forgot-password/verify-otp', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, otp }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function resetPasswordWithOtp(payload) {
  const response = await fetch('/api/auth/forgot-password/reset', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function requestLoginOtp(identifier) {
  const response = await fetch('/api/auth/login/request-otp', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function verifyLoginOtp(identifier, otp) {
  const response = await fetch('/api/auth/login/verify-otp', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, otp }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}
