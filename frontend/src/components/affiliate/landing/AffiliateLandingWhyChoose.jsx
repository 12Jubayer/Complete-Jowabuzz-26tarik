import { motion } from 'framer-motion';
import SectionBadge from './SectionBadge';
import { WHY_CHOOSE } from './constants';
import { fadeUp } from './motion';

export default function AffiliateLandingWhyChoose() {
  return (
    <section id="benefits" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <SectionBadge>Why Choose Us</SectionBadge>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-4 text-2xl font-bold text-white sm:text-3xl"
          >
            কেন <span className="text-[#3B82F6]">JowaBuzz Affiliates</span>?
          </motion.h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_CHOOSE.map((item, i) => (
            <motion.article
              key={item.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i * 0.08}
              whileHover={{
                y: -6,
                boxShadow: '0 0 35px rgba(59,130,246,0.18)',
                borderColor: 'rgba(59,130,246,0.35)',
              }}
              className="rounded-2xl border border-white/5 bg-[#07132A] p-6 transition-colors"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B82F6] text-sm font-bold text-white">
                {item.num}
              </span>
              <h3 className="mt-4 text-lg font-bold uppercase tracking-wide text-white">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.desc}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
