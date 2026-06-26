export async function fetchPublicHomepageSliders() {
  const response = await fetch('/api/site/sliders');
  if (!response.ok) {
    throw new Error('Failed to load sliders');
  }
  const body = await response.json();
  return body.data || [];
}

export default fetchPublicHomepageSliders;
