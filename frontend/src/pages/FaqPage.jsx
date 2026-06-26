import MobilePageLayout from '../layouts/MobilePageLayout';
import FaqSection from '../components/FaqSection';

export default function FaqPage() {
  return (
    <MobilePageLayout>
      <div className="faq-page mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <FaqSection />
      </div>
    </MobilePageLayout>
  );
}
