import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { colors } from '../config/theme';
import { useSiteBranding } from '../context/SiteBrandingContext';
import SiteLogo from './SiteLogo';

const fullText =
  'Jowabuzz is a premier online cricket exchange and casino platform tailored for Bangladesh. Enjoy live sports betting, premium slots, crash games, and live casino tables with fast local payments including bKash, Nagad, Rocket, and Upay. Our platform is built for mobile-first players who want secure deposits, quick withdrawals, and a smooth gaming experience any time of day.';

const previewText = `${fullText.slice(0, 220)}...`;

export default function AboutSection() {
  const [expanded, setExpanded] = useState(false);
  const { siteName } = useSiteBranding();

  return (
    <section className="site-about-section" style={{ backgroundColor: colors.mainBg }}>
      <div className="site-about-section__inner">
        <SiteLogo variant="about" linkTo={null} />
        <h2 className="site-about-section__title">
          {siteName}: Cricket Exchange &amp; Casino Sites in Bangladesh
        </h2>

        <p className="site-about-section__text">{expanded ? fullText : previewText}</p>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="site-about-section__read-more"
        >
          <span>{expanded ? 'Read Less' : 'Read More'}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
    </section>
  );
}
