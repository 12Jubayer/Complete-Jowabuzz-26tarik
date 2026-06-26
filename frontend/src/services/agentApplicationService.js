export async function submitAgentApplication(payload) {
  const response = await fetch('/api/agent-applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || 'Failed to submit application');
  }

  return body;
}
