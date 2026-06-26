export async function fetchPublicGameProviders() {
  const response = await fetch('/api/public/game-providers');
  if (!response.ok) {
    throw new Error('Failed to load game providers');
  }

  const body = await response.json();
  return Array.isArray(body.data) ? body.data : [];
}

export default fetchPublicGameProviders;
