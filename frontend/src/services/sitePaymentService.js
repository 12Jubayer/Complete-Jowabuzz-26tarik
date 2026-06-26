export async function fetchPublicPaymentMethods() {
  const response = await fetch('/api/site-config/payment-methods');
  if (!response.ok) {
    throw new Error('Failed to load payment methods');
  }
  const body = await response.json();
  return body.data || [];
}

export default fetchPublicPaymentMethods;
