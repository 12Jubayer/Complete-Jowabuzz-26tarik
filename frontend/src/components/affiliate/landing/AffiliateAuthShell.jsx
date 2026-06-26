import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Network } from 'lucide-react';

export default function AffiliateAuthShell({ title, subtitle, children, footer }) {
  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8 sm:py-12"
      style={{
        backgroundColor: '#020617',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#3B82F6]/20 blur-[100px]" />
        <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#07132A]/90 shadow-2xl shadow-black/40 backdrop-blur-xl"
      >
        <div className="relative overflow-hidden bg-gradient-to-r from-[#3B82F6] via-cyan-500 to-indigo-600 px-5 py-7 text-center sm:px-6 sm:py-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.18),transparent_45%)]" />

          <Link
            to="/affiliate"
            className="relative mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg shadow-black/20 transition-transform hover:scale-105"
          >
            <Network size={28} strokeWidth={1.8} className="text-white" />
          </Link>

          <div className="relative mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
              JowaBuzz Affiliate
            </p>
          </div>

          <h1 className="relative text-xl font-bold text-white sm:text-2xl">{title}</h1>
          <p className="relative mt-2 text-sm leading-relaxed text-white/90">{subtitle}</p>
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>

        {footer && (
          <div className="border-t border-white/5 px-4 py-4 text-center sm:px-6">{footer}</div>
        )}
      </motion.div>
    </div>
  );
}
