export const footerSectionTitles = {
  brandAmbassadors: { en: 'Brand Ambassadors', bn: 'ব্র্যান্ড অ্যাম্বাসেডর' },
  gamingLicense: { en: 'Gaming License', bn: 'গেমিংয়ের লাইসেন্স' },
  appDownload: { en: 'APP Download', bn: 'অ্যাপ ডাউনলোড' },
  communityWebsites: { en: 'Community Websites', bn: 'কমিউনিটি ওয়েবসাইট' },
  paymentMethods: { en: 'Payment Methods', bn: 'মূল্য পরিশোধ পদ্ধতি' },
};

export const footerLinks = [
  { label: 'Responsible Gaming', path: '/responsible-gaming' },
  { label: 'About Us', path: '/about-us' },
  { label: 'Security', path: '/security' },
  { label: 'Privacy Policy', path: '/privacy-policy' },
  { label: 'FAQ', path: '/faq' },
];

export const socialLinks = [
  { id: 'facebook', label: 'Facebook', icon: '/images/social-facebook.svg' },
  { id: 'telegram', label: 'Telegram', icon: '/images/social-telegram.svg' },
  { id: 'instagram', label: 'Instagram', icon: '/images/social-instagram.svg' },
  { id: 'youtube', label: 'YouTube', icon: '/images/social-youtube.svg' },
];

export const paymentMethods = [
  { id: 'bank', label: 'Bank Deposit', icon: '/images/payment-bank.png', tileClass: 'site-footer__payment-item--bank' },
  { id: 'bkash', label: 'bKash', icon: '/images/payment-bkash.png', tileClass: 'site-footer__payment-item--bkash' },
  { id: 'rocket', label: 'Rocket', icon: '/images/payment-rocket.png', tileClass: 'site-footer__payment-item--rocket' },
  { id: 'nagad', label: 'Nagad', icon: '/images/payment-nagad.png', tileClass: 'site-footer__payment-item--nagad' },
  { id: 'upay', label: 'Upay', icon: '/images/payment-upay.png', tileClass: 'site-footer__payment-item--upay' },
];

export const licenseLogos = [
  {
    id: 'curacao',
    label: 'Gaming Curacao',
    icon: '/images/license-curacao.png',
    logoClass: 'site-footer__license-logo--curacao',
  },
  {
    id: 'anjouan',
    label: 'Anjouan eGaming',
    icon: '/images/license-anjouan.png',
    logoClass: 'site-footer__license-logo--anjouan',
  },
];

export const brandAmbassador = {
  name: 'Anrich Nortje',
  role: 'South African Cricketer',
  roleBn: 'দক্ষিণ আফ্রিকার ক্রিকেটার',
  signature: '/images/ambassador-signature.png',
};

export const trustBadges = [
  { id: 'gc', label: 'Gaming Curacao', icon: '/images/license-curacao.png' },
  { id: '18plus', label: '18+', text: '18+' },
  { id: 'responsible', label: 'Responsible Gaming', text: 'STOP' },
];
