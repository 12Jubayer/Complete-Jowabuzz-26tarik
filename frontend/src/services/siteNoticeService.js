export async function fetchPublicNoticeConfig() {
  const response = await fetch('/api/site-config/notice');
  if (!response.ok) {
    throw new Error('Failed to load notice');
  }
  return response.json();
}

export default fetchPublicNoticeConfig;
