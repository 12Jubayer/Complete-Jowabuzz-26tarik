import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, Menu, Network, X } from 'lucide-react';
import { NAV_ITEMS } from './constants';

export default function AffiliateLandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [language, setLanguage] = useState('English');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (href) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/5 bg-[#020617]/80 shadow-lg shadow-black/20 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:py-4">
        <a href="#home" className="flex shrink-0 items-center gap-2.5" onClick={() => handleNav('#home')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-indigo-600 shadow-lg shadow-[#3B82F6]/25">
            <Network size={20} className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white sm:text-base">JowaBuzz</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#60A5FA] sm:text-xs">
              Affiliate
            </p>
          </div>
        </a>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => handleNav(item.href)}
              className="text-xs font-semibold uppercase tracking-wider text-slate-300 transition-colors hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition-colors hover:border-[#3B82F6]/40"
            >
              <Globe size={16} />
              {language}
              <ChevronDown size={14} />
            </button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 mt-2 w-36 overflow-hidden rounded-lg border border-white/10 bg-[#07132A] shadow-xl"
                >
                  {['English', 'বাংলা'].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setLanguage(lang);
                        setLangOpen(false);
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-[#3B82F6]/20"
                    >
                      {lang}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            to="/affiliate/login"
            className="rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#2563EB] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
          >
            Login
          </Link>
          <Link
            to="/affiliate/signup"
            className="rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-[#22C55E]/50 hover:bg-[#22C55E]/10"
          >
            Register
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg border border-white/10 p-2 text-white lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5 bg-[#020617]/95 backdrop-blur-xl lg:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleNav(item.href)}
                  className="block w-full rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-200 hover:bg-white/5"
                >
                  {item.label}
                </button>
              ))}
              <div className="flex gap-3 pt-3">
                <Link
                  to="/affiliate/login"
                  className="flex-1 rounded-lg bg-[#3B82F6] py-3 text-center text-sm font-semibold text-white"
                >
                  Login
                </Link>
                <Link
                  to="/affiliate/signup"
                  className="flex-1 rounded-lg border border-white/15 py-3 text-center text-sm font-semibold text-white"
                >
                  Register
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
