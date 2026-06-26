import { X } from 'lucide-react';
import PwaInstallGuide from './PwaInstallGuide';

export default function PwaInstallModal({ onClose }) {
  return (
    <div className="pwa-install-modal" role="dialog" aria-modal="true" aria-label="Install Jowabuzz app">
      <button type="button" className="pwa-install-modal__backdrop" onClick={onClose} aria-label="Close" />
      <div className="pwa-install-modal__panel">
        <button type="button" className="pwa-install-modal__close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <PwaInstallGuide />
      </div>
    </div>
  );
}
