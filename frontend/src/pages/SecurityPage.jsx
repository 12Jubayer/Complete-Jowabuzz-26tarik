import MobilePageLayout from '../layouts/MobilePageLayout';
import SecuritySection from '../components/SecuritySection';

export default function SecurityPage() {
  return (
    <MobilePageLayout>
      <div className="security-page mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <SecuritySection />
      </div>
    </MobilePageLayout>
  );
}
