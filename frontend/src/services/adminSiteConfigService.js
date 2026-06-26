import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminNoticeConfig() {
  const response = await adminFetch('/api/admin/site-config/notice', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminNoticeConfig(payload) {
  const response = await adminFetch('/api/admin/site-config/notice', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminPaymentMethods() {
  const response = await adminFetch('/api/admin/site-config/payment-methods', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminPaymentMethods(methods) {
  const response = await adminFetch('/api/admin/site-config/payment-methods', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ methods }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminHomepageSliders() {
  const response = await adminFetch('/api/admin/site-config/sliders', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminHomepageSliders(sliders) {
  const response = await adminFetch('/api/admin/site-config/sliders', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ sliders }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function uploadAdminSliderImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await adminFetch('/api/admin/upload/slider-image', {
    method: 'POST',
    headers: getAdminAuthHeaders(false),
    body: formData,
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminSocialLinks() {
  const response = await adminFetch('/api/admin/site-config/social-links', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminSocialLinks(links) {
  const response = await adminFetch('/api/admin/site-config/social-links', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(links),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminBranding() {
  const response = await adminFetch('/api/admin/site-config/logo-icon', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminBranding(payload) {
  const response = await adminFetch('/api/admin/site-config/logo-icon', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function uploadAdminLogo(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await adminFetch('/api/admin/upload/logo', {
    method: 'POST',
    headers: getAdminAuthHeaders(false),
    body: formData,
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function uploadAdminFavicon(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await adminFetch('/api/admin/upload/favicon', {
    method: 'POST',
    headers: getAdminAuthHeaders(false),
    body: formData,
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export default fetchAdminNoticeConfig;
