import { useCallback, useEffect, useState } from 'react';
import {
  Home,
  Shield,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react';
import LogoLoader from '../components/LogoLoader';
import PwaInstallGuide from '../components/PwaInstallGuide';
import MobilePageLayout from '../layouts/MobilePageLayout';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { fetchAppDownloadInfo } from '../services/appDownloadService';
import './DownloadPage.css';

const FEATURE_ICONS = [Zap, Shield, Sparkles, Smartphone, Smartphone, Smartphone, Shield];

export default function DownloadPage() {
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState(null);
  const { showGuide, statusMessage, handleInstall } = usePwaInstall();

  const loadAppInfo = useCallback(async () => {
    setLoading(true);
    const result = await fetchAppDownloadInfo();
    setApp(result.app);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAppInfo();
  }, [loadAppInfo]);

  return (
    <MobilePageLayout>
      <div className="download-page">
        <div className="download-page__glow download-page__glow--left" aria-hidden="true" />
        <div className="download-page__glow download-page__glow--right" aria-hidden="true" />

        <div className="download-page__inner">
          {loading ? (
            <div className="download-page__loader">
              <LogoLoader />
            </div>
          ) : (
            <>
              <section className="download-page__hero">
                <span className="download-page__badge">Official Mobile App</span>
                <h1 className="download-page__title">{app?.appName || 'Jowabuzz Mobile App'}</h1>
                <p className="download-page__subtitle">
                  Jowabuzz phone view — fast, secure, and optimized for your device.
                </p>

                <div className="download-page__phone" aria-hidden="true">
                  <div className="download-page__phone-screen">
                    <span className="download-page__phone-logo">JB</span>
                    <span className="download-page__phone-text">jowabuzz.com</span>
                  </div>
                </div>
              </section>

              <section className="download-page__features">
                <h2 className="download-page__section-title">Why Install?</h2>
                <div className="download-page__feature-grid">
                  {(app?.features || []).map((feature, index) => {
                    const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
                    return (
                      <article key={feature} className="download-page__feature-card">
                        <span className="download-page__feature-icon">
                          <Icon size={18} />
                        </span>
                        <span>{feature}</span>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="download-page__meta">
                <div className="download-page__meta-card">
                  <span className="download-page__meta-label">App Version</span>
                  <strong>{app?.version || '1.0.2'}</strong>
                </div>
                <div className="download-page__meta-card">
                  <span className="download-page__meta-label">Install Type</span>
                  <strong>Web App</strong>
                </div>
              </section>

              <section className="download-page__notes">
                <h2 className="download-page__section-title">About App</h2>
                <div className="download-page__notes-card">
                  <p>
                    Official Jowabuzz mobile app for your phone home screen.
                    Opens jowabuzz.com phone view instantly — no APK file needed.
                  </p>
                </div>
              </section>

              <section className="download-page__cta">
                <button
                  type="button"
                  className="download-page__download-btn download-page__download-btn--primary"
                  onClick={handleInstall}
                >
                  <Home size={20} />
                  Install App
                </button>
                <p className="download-page__hint download-page__hint--good">
                  No Play Protect warning · Opens like a real app
                </p>

                {statusMessage && (
                  <p className="download-page__status">{statusMessage}</p>
                )}

                {showGuide && (
                  <PwaInstallGuide className="download-page__pwa-guide" />
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </MobilePageLayout>
  );
}
