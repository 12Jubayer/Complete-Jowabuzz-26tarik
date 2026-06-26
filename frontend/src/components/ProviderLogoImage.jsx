import { useMemo, useState } from 'react';
import { DEFAULT_LOGO, getProviderLogoCandidates } from '../utils/providerLogo';

export default function ProviderLogoImage({
  provider,
  className = '',
  alt = '',
}) {
  const candidates = useMemo(
    () => getProviderLogoCandidates(provider),
    [provider?.code, provider?.name, provider?.logo],
  );
  const [index, setIndex] = useState(0);
  const src = candidates[Math.min(index, candidates.length - 1)] || DEFAULT_LOGO;

  return (
    <img
      src={src}
      alt={alt || provider?.name || 'Provider'}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => {
        setIndex((current) => (current < candidates.length - 1 ? current + 1 : current));
      }}
    />
  );
}
