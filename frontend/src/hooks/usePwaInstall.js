import { useCallback, useEffect, useState } from 'react';
import { subscribePwaInstall, triggerPwaInstall } from '../services/appDownloadService';

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => subscribePwaInstall(setInstallPrompt), []);

  const handleInstall = useCallback(async () => {
    setStatusMessage('');
    const result = await triggerPwaInstall();

    if (result.mode === 'prompt') {
      setShowGuide(false);
      setStatusMessage('Install prompt opened. Tap Install to add Jowabuzz to your phone.');
      return result;
    }

    setShowGuide(true);
    return result;
  }, []);

  const dismissGuide = useCallback(() => {
    setShowGuide(false);
  }, []);

  return {
    installPrompt,
    canPrompt: Boolean(installPrompt),
    showGuide,
    statusMessage,
    handleInstall,
    dismissGuide,
  };
}

export default usePwaInstall;
