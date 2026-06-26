import { motion } from 'framer-motion';
import SectionBadge from './SectionBadge';
import { HOW_IT_WORKS } from './constants';
import { fadeUp } from './motion';

export default function AffiliateLandingHowItWorks() {
  return (
    <section className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <SectionBadge>How It Works</SectionBadge>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-4 text-2xl font-bold text-white sm:text-3xl"
          >
            ৩ ধাপে শুরু করুন
          </motion.h2>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#07132A] p-6 sm:p-10">
          <div className="absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#3B82F6]/30 to-transparent lg:block" />

          <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i * 0.15}
                className="relative text-center"
              >
                <motion.span
                  whileHover={{ scale: 1.1 }}
                  className="inline-block text-4xl font-black sm:text-5xl"
                  style={{ color: item.color }}
                >
                  {item.step}
                </motion.span>
                <p className="mt-4 text-base font-semibold text-white sm:text-lg">{item.title}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="mx-auto my-4 h-8 w-px bg-white/10 lg:hidden" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
