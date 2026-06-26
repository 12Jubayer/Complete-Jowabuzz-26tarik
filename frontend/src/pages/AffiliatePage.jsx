import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAffiliateAuth } from '../context/AffiliateAuthContext';
import AffiliateLandingAbout from '../components/affiliate/landing/AffiliateLandingAbout';
import AffiliateLandingCTA from '../components/affiliate/landing/AffiliateLandingCTA';
import AffiliateLandingCommission from '../components/affiliate/landing/AffiliateLandingCommission';
import AffiliateLandingFAQ from '../components/affiliate/landing/AffiliateLandingFAQ';
import AffiliateLandingFooter from '../components/affiliate/landing/AffiliateLandingFooter';
import AffiliateLandingHeader from '../components/affiliate/landing/AffiliateLandingHeader';
import AffiliateLandingHero from '../components/affiliate/landing/AffiliateLandingHero';
import AffiliateLandingHowItWorks from '../components/affiliate/landing/AffiliateLandingHowItWorks';
import AffiliateLandingPartnership from '../components/affiliate/landing/AffiliateLandingPartnership';
import AffiliateLandingStats from '../components/affiliate/landing/AffiliateLandingStats';
import AffiliateLandingTestimonials from '../components/affiliate/landing/AffiliateLandingTestimonials';
import AffiliateLandingWhyChoose from '../components/affiliate/landing/AffiliateLandingWhyChoose';

const META_DESCRIPTION =
  'JowaBuzz Affiliate Program-এ যোগ দিয়ে প্রতি সপ্তাহে কমিশন আয় করুন। Real-Time Tracking, Secure Payment এবং Premium Affiliate System উপভোগ করুন.';

function useLandingSeo() {
  useEffect(() => {
    document.title = 'JowaBuzz Affiliate Program';

    let viewport = document.querySelector('meta[name="viewport"]');
    if (viewport && !viewport.content.includes('viewport-fit')) {
      viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
    }

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', META_DESCRIPTION);

    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);
}

export default function AffiliatePage() {
  const { authenticated } = useAffiliateAuth();
  const location = useLocation();
  useLandingSeo();

  if (authenticated && !location.state?.sidebarLanding) {
    return <Navigate to="/affiliate/dashboard" replace />;
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#020617] text-white">
      <AffiliateLandingHeader />
      <main>
        <AffiliateLandingHero />
        <AffiliateLandingStats />
        <AffiliateLandingAbout />
        <AffiliateLandingPartnership />
        <AffiliateLandingHowItWorks />
        <AffiliateLandingWhyChoose />
        <AffiliateLandingCommission />
        <AffiliateLandingTestimonials />
        <AffiliateLandingFAQ />
        <AffiliateLandingCTA />
      </main>
      <AffiliateLandingFooter />
    </div>
  );
}
