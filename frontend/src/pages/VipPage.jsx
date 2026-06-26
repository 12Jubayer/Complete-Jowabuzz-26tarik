import { useEffect, useState } from 'react';
import vipHeroImage from '../assets/vip-hero.png';
import LogoLoader from '../components/LogoLoader';
import InfoCard from '../components/InfoCard';
import VipLevelCard from '../components/VipLevelCard';
import MobilePageLayout from '../layouts/MobilePageLayout';
import { vipPageContent } from '../data/vipLevels';
import { getVipLevels } from '../services/vipService';

export default function VipPage() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getVipLevels()
      .then((data) => {
        if (!active) return;
        setLevels(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <MobilePageLayout>
      <div className="vip-page mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <section className="vip-page__hero">
          <div className="vip-page__hero-copy">
            <span className="vip-page__badge">{vipPageContent.badge}</span>
            <h1 className="vip-page__title">
              <span>{vipPageContent.title[0]}</span>
              <span className="vip-page__title-accent">{vipPageContent.title[1]}</span>
            </h1>
            <p className="vip-page__subtitle">{vipPageContent.subtitle}</p>
          </div>

          <div className="vip-page__hero-visual">
            <div className="vip-page__hero-glow" aria-hidden="true" />
            <img
              src={vipHeroImage}
              alt="Jowabuzz VIP"
              className="vip-page__hero-image"
            />
          </div>
        </section>

        <section className="vip-page__info-grid">
          <InfoCard title={vipPageContent.aboutTitle}>{vipPageContent.aboutText}</InfoCard>
          <InfoCard title={vipPageContent.joinTitle} icon="help">
            {vipPageContent.joinText}
          </InfoCard>
        </section>

        <section className="vip-page__levels-section">
          <h2 className="vip-page__levels-heading">
            <span className="vip-page__levels-heading-accent">VIP</span>
            <span> Levels</span>
          </h2>

          {loading ? (
            <div className="vip-page__status">
              <LogoLoader size="md" label="Loading VIP levels" />
            </div>
          ) : (
            <div className="vip-page__levels-grid">
              {levels.map((level) => (
                <VipLevelCard key={level.id} level={level} />
              ))}
            </div>
          )}
        </section>

        <section className="vip-page__terms">
          <h3 className="vip-page__terms-title">{vipPageContent.termsTitle}</h3>
          <ul className="vip-page__terms-list">
            {vipPageContent.terms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </section>
      </div>
    </MobilePageLayout>
  );
}
