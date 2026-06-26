import { MessageCircle, Network, Send, Share2, Video } from 'lucide-react';
import { FOOTER_LINKS } from './constants';

const SOCIAL = [
  { icon: Send, label: 'Telegram', href: '#' },
  { icon: Share2, label: 'Facebook', href: '#' },
  { icon: MessageCircle, label: 'WhatsApp', href: '#' },
  { icon: Video, label: 'YouTube', href: '#' },
];

export default function AffiliateLandingFooter() {
  return (
    <footer id="contact" className="border-t border-white/5 bg-[#020617] pt-14 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-indigo-600">
                <Network size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-white">JowaBuzz</p>
                <p className="text-xs uppercase tracking-widest text-[#60A5FA]">Affiliate Program</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              JowaBuzz Affiliate Program-এ যোগ দিয়ে প্রতি সপ্তাহে কমিশন আয় করুন। Real-Time
              Tracking, Secure Payment এবং Premium Affiliate System উপভোগ করুন।
            </p>
            <p className="mt-4 text-sm text-slate-300">
              Contact:{' '}
              <a href="mailto:support@jowabuzz.com" className="text-[#60A5FA] hover:underline">
                support@jowabuzz.com
              </a>
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">{title}</h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-400 transition-colors hover:text-[#60A5FA]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} JowaBuzz Affiliate Program. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {SOCIAL.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="text-slate-400 transition-colors hover:text-[#60A5FA]"
              >
                <Icon size={20} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
