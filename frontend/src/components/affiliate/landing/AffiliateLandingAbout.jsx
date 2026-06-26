import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import GlobeIllustration from './GlobeIllustration';
import SectionBadge from './SectionBadge';
import { ABOUT_FEATURES } from './constants';
import { fadeUp } from './motion';

export default function AffiliateLandingAbout() {
  return (
    <section id="about" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center lg:mb-16">
          <SectionBadge>About</SectionBadge>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-4 text-2xl font-bold text-white sm:text-3xl lg:text-4xl"
          >
            কেন{' '}
            <span className="text-[#3B82F6]">JowaBuzz Affiliate Program</span>-এ যোগ দিবেন?
          </motion.h2>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <GlobeIllustration />
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {ABOUT_FEATURES.map((feature, i) => (
              <motion.div
                key={feature}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i * 0.08}
                whileHover={{ scale: 1.02, borderColor: 'rgba(59,130,246,0.4)' }}
                className="flex items-start gap-3 rounded-2xl border border-white/5 bg-[#07132A] p-4 transition-all hover:shadow-[0_0_25px_rgba(59,130,246,0.12)] sm:p-5"
              >
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#22C55E]" />
                <div>
                  <p className="font-semibold text-white">{feature}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Premium affiliate tools for better growth and earnings.
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
