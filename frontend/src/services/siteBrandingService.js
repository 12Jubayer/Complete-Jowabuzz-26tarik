export async function fetchPublicBranding() {
  const response = await fetch('/api/site-config/branding');
  if (!response.ok) {
    throw new Error('Failed to load branding');
  }
  return response.json();
}

export default fetchPublicBranding;
