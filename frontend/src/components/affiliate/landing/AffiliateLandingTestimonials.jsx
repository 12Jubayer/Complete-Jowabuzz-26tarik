import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import SectionBadge from './SectionBadge';
import { TESTIMONIALS } from './constants';
import { fadeUp } from './motion';

export default function AffiliateLandingTestimonials() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const active = TESTIMONIALS[index];

  return (
    <section className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <SectionBadge>Success Stories</SectionBadge>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-4 text-2xl font-bold text-white sm:text-3xl"
          >
            Affiliate <span className="text-[#3B82F6]">Testimonials</span>
          </motion.h2>
        </div>

        <div className="relative mx-auto max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.article
              key={index}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.45 }}
              className="rounded-3xl border border-white/5 bg-[#07132A] p-8 sm:p-10"
            >
              <Quote size={32} className="text-[#3B82F6]/60" />
              <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
                &ldquo;{active.review}&rdquo;
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6">
                <div>
                  <p className="font-bold text-white">{active.name}</p>
                  <p className="text-sm text-slate-400">{active.country}</p>
                </div>
                <div className="rounded-xl bg-[#22C55E]/15 px-4 py-2">
                  <p className="text-xs text-slate-400">মাসিক আয়</p>
                  <p className="font-bold text-[#22C55E]">{active.earnings}</p>
                </div>
              </div>
            </motion.article>
          </AnimatePresence>

          <div className="mt-6 flex justify-center gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-8 bg-[#3B82F6]' : 'w-2 bg-white/20'
                }`}
                aria-label={`Testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-10 hidden gap-5 lg:grid lg:grid-cols-3">
          {TESTIMONIALS.map((item, i) => (
            <motion.div
              key={item.name}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i * 0.1}
              className="rounded-2xl border border-white/5 bg-[#07132A]/60 p-5"
            >
              <p className="text-sm text-slate-400">{item.review}</p>
              <p className="mt-4 font-semibold text-white">{item.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
