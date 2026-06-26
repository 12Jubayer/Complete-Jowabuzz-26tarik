import MobilePageLayout from '../layouts/MobilePageLayout';
import ResponsibleGamingSection from '../components/ResponsibleGamingSection';

export default function ResponsibleGamingPage() {
  return (
    <MobilePageLayout>
      <div className="responsible-gaming-page mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <ResponsibleGamingSection />
      </div>
    </MobilePageLayout>
  );
}
