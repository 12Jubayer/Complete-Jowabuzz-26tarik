import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../config/theme';
import {
  brandAmbassador,
  footerLinks,
  footerSectionTitles,
  licenseLogos,
  paymentMethods,
  socialLinks as socialPlatforms,
  trustBadges,
} from '../data/footerData';
import PwaInstallGuide from './PwaInstallGuide';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { fetchPublicSocialLinks } from '../services/siteSocialService';

function FooterBlock({ title, children, className = '' }) {
  return (
    <div className={`site-footer__block ${className}`.trim()}>
      <h3 className="site-footer__title">
        <span className="site-footer__title-mobile">{title.bn}</span>
        <span className="site-footer__title-desktop">{title.en}</span>
      </h3>
      {children}
    </div>
  );
}

function FooterLinkItem({ link, showSeparator = false }) {
  const content = link.path ? (
    <Link to={link.path} className="site-footer__link-anchor site-footer__link-text">
      {link.label}
    </Link>
  ) : (
    <span className="site-footer__link-text">{link.label}</span>
  );

  return (
    <span className="site-footer__link-item">
      {content}
      {showSeparator ? <span className="site-footer__link-sep">|</span> : null}
    </span>
  );
}

export default function Footer() {
  const [socialUrls, setSocialUrls] = useState({});
  const { showGuide, handleInstall } = usePwaInstall();

  const loadSocialLinks = useCallback(async () => {
    try {
      const data = await fetchPublicSocialLinks();
      setSocialUrls(data || {});
    } catch {
      setSocialUrls({});
    }
  }, []);

  useEffect(() => {
    loadSocialLinks();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadSocialLinks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadSocialLinks]);

  return (
    <footer className="site-footer" style={{ backgroundColor: colors.mainBg }}>
      <div className="site-footer__inner">
        <div className="site-footer__row site-footer__row--ambassador">
          <FooterBlock title={footerSectionTitles.brandAmbassadors}>
            <div className="site-footer__ambassador">
              <img
                src={brandAmbassador.signature}
                alt={brandAmbassador.name}
                className="site-footer__ambassador-signature"
                loading="lazy"
              />
              <div className="site-footer__ambassador-info">
                <p className="site-footer__ambassador-name">{brandAmbassador.name}</p>
                <p className="site-footer__ambassador-role">
                  <span className="site-footer__caption-mobile">{brandAmbassador.roleBn}</span>
                  <span className="site-footer__caption-desktop">{brandAmbassador.role}</span>
                </p>
              </div>
            </div>
          </FooterBlock>
        </div>

        <div className="site-footer__row site-footer__row--4">
          <FooterBlock title={footerSectionTitles.gamingLicense}>
            <div className="site-footer__logo-row">
              {licenseLogos.map((license) => (
                <img
                  key={license.id}
                  src={license.icon}
                  alt={license.label}
                  className={`site-footer__license-logo ${license.logoClass || ''}`.trim()}
                  loading="lazy"
                />
              ))}
            </div>
          </FooterBlock>

          <FooterBlock title={footerSectionTitles.appDownload}>
            <button type="button" className="site-footer__app-btn" onClick={handleInstall}>
              <img src="/images/android-icon.svg" alt="" className="site-footer__app-icon" aria-hidden="true" />
              <span className="site-footer__app-btn-text">
                <span className="site-footer__app-btn-line">Download for</span>
                <span className="site-footer__app-btn-line site-footer__app-btn-line--bold">Android</span>
              </span>
            </button>
            {showGuide ? <PwaInstallGuide className="site-footer__pwa-guide" compact /> : null}
          </FooterBlock>

          <FooterBlock title={footerSectionTitles.communityWebsites}>
            <div className="site-footer__social-row">
              {socialPlatforms.map((social) => {
                const url = String(socialUrls[social.id] || '').trim();
                const content = (
                  <img
                    src={social.icon}
                    alt={social.label}
                    className="site-footer__social-icon"
                  />
                );

                if (url) {
                  return (
                    <a
                      key={social.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="site-footer__social-link"
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <span key={social.id} className="site-footer__social-link is-disabled" aria-hidden="true">
                    {content}
                  </span>
                );
              })}
            </div>
          </FooterBlock>
        </div>

        <FooterBlock title={footerSectionTitles.paymentMethods} className="site-footer__block--full">
          <div className="site-footer__payment-row">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`site-footer__payment-item ${method.tileClass || ''}`.trim()}
              >
                <img
                  src={method.icon}
                  alt={method.label}
                  className="site-footer__payment-logo"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </FooterBlock>

        <div className="site-footer__links-row">
          {footerLinks.slice(0, 3).map((link, index) => (
            <FooterLinkItem key={link.label} link={link} showSeparator={index < 2} />
          ))}
          <span className="site-footer__links-row-desktop">
            {footerLinks.slice(3).map((link) => (
              <span key={link.label} className="site-footer__link-item">
                <span className="site-footer__link-sep">|</span>
                {link.path ? (
                  <Link to={link.path} className="site-footer__link-anchor site-footer__link-text">
                    {link.label}
                  </Link>
                ) : (
                  <span className="site-footer__link-text">{link.label}</span>
                )}
              </span>
            ))}
          </span>
        </div>

        <div className="site-footer__bottom">
          <p className="site-footer__copyright">© 2026 Jowabuzz Copyrights. All Rights Reserved.</p>
          <div className="site-footer__trust-row">
            {trustBadges.map((badge) =>
              badge.icon ? (
                <img
                  key={badge.id}
                  src={badge.icon}
                  alt={badge.label}
                  className={`site-footer__trust-badge ${badge.id === 'gc' ? 'site-footer__trust-badge--gc' : ''}`.trim()}
                />
              ) : (
                <span key={badge.id} className="site-footer__trust-text">
                  {badge.text}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
