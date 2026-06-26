export async function fetchPublicSocialLinks() {
  const response = await fetch('/api/site-config/social-links');
  if (!response.ok) {
    throw new Error('Failed to load social links');
  }
  return response.json();
}

export default fetchPublicSocialLinks;
