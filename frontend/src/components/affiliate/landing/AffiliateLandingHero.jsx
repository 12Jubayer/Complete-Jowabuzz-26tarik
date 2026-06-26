import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import DashboardMockup from './DashboardMockup';
import { fadeUp } from './motion';

export default function AffiliateLandingHero() {
  const scrollTo = (id) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="home"
      className="relative overflow-hidden pt-24 sm:pt-28 lg:pt-32"
      style={{ paddingTop: 'max(6rem, calc(env(safe-area-inset-top) + 5rem))' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-[#3B82F6]/20 blur-[100px]" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[100px]" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute right-1/4 top-24 h-40 w-40 rounded-full border border-[#3B82F6]/10"
        />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:pb-24">
        <div>
          <motion.span
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center gap-2 rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-4 py-1.5 text-xs font-semibold text-[#93C5FD]"
          >
            <Sparkles size={14} />
            Trusted Affiliate Program
          </motion.span>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.1}
            className="mt-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl"
          >
            JowaBuzz Affiliate Program-এর মাধ্যমে{' '}
            <span className="bg-gradient-to-r from-[#3B82F6] via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              আরও বেশি আয় করুন
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.2}
            className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg"
          >
            হাজারো Affiliate-এর সাথে যুক্ত হয়ে JowaBuzz-এ নতুন প্লেয়ার রেফার করে কমিশন আয় করুন।
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.3}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Link
              to="/affiliate/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/30 transition-all hover:bg-[#2563EB] hover:shadow-[0_0_30px_rgba(59,130,246,0.45)]"
            >
              Join Now
              <ArrowRight size={18} />
            </Link>
            <button
              type="button"
              onClick={() => scrollTo('#about')}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:border-[#3B82F6]/40 hover:bg-white/10"
            >
              Learn More
            </button>
          </motion.div>
        </div>

        <DashboardMockup />
      </div>
    </section>
  );
}
