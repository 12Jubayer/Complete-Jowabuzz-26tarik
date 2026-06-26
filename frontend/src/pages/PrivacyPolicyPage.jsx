import MobilePageLayout from '../layouts/MobilePageLayout';
import PrivacyPolicySection from '../components/PrivacyPolicySection';

export default function PrivacyPolicyPage() {
  return (
    <MobilePageLayout>
      <div className="privacy-policy-page mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <PrivacyPolicySection />
      </div>
    </MobilePageLayout>
  );
}
