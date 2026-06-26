import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import SectionBadge from './SectionBadge';
import { FAQ_ITEMS } from './constants';
import { fadeUp } from './motion';

export default function AffiliateLandingFAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <SectionBadge>FAQ</SectionBadge>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-4 text-2xl font-bold text-white sm:text-3xl"
          >
            Frequently Asked <span className="text-[#3B82F6]">Questions</span>
          </motion.h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const open = openIndex === i;
            return (
              <motion.div
                key={item.q}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i * 0.06}
                className="overflow-hidden rounded-2xl border border-white/5 bg-[#07132A]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                >
                  <span className="font-semibold text-white">{item.q}</span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-[#60A5FA] transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="border-t border-white/5 px-5 pb-5 pt-2 text-sm leading-relaxed text-slate-400 sm:px-6">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
