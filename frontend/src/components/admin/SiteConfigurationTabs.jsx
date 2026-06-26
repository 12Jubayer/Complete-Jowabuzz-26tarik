import { NavLink } from 'react-router-dom';
import {
  Bell,
  CreditCard,
  Globe,
  Image,
  MessageCircle,
  Share2,
  Smartphone,
} from 'lucide-react';

const tabs = [
  { label: 'Notice', path: '/admin/site-configuration/notice', icon: Bell },
  { label: 'Payment', path: '/admin/site-configuration/payment-method', icon: CreditCard },
  { label: 'Slider', path: '/admin/site-configuration/slider', icon: Image },
  { label: 'Social', path: '/admin/site-configuration/social-links', icon: Share2 },
  { label: 'Logo & Icon', path: '/admin/site-configuration/logo-icon', icon: Globe },
  { label: 'App Download', path: '/admin/site-configuration/app-download', icon: Smartphone },
  { label: 'Contact us', path: '/admin/contact-us', icon: MessageCircle },
];

export default function SiteConfigurationTabs() {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              [
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100',
              ].join(' ')
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}

export function SiteConfigurationHeader() {
  return (
    <div>
      <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Site Configuration</h2>
      <p className="mt-1 text-sm text-slate-500">Manage site-wide content and branding</p>
    </div>
  );
}
