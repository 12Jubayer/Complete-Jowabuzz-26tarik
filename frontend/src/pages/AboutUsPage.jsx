import MobilePageLayout from '../layouts/MobilePageLayout';
import AboutUsSection from '../components/AboutUsSection';

export default function AboutUsPage() {
  return (
    <MobilePageLayout>
      <div className="about-us-page mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <AboutUsSection />
      </div>
    </MobilePageLayout>
  );
}
