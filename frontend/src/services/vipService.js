import { getFallbackVipLevels, mapVipLevelForDisplay } from '../utils/mapVipLevels';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function getVipLevels() {
  try {
    const response = await fetch('/api/vip-levels');
    if (!response.ok) await parseError(response);
    const result = await response.json();
    const rows = Array.isArray(result.data) ? result.data : [];
    if (!rows.length) return getFallbackVipLevels();
    return rows.map((row) => mapVipLevelForDisplay(row));
  } catch {
    return getFallbackVipLevels();
  }
}

export default getVipLevels;
