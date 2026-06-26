import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Handshake } from 'lucide-react';
import SectionBadge from './SectionBadge';
import { fadeUp } from './motion';

export default function AffiliateLandingPartnership() {
  return (
    <section className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07132A]/60 backdrop-blur-xl">
          <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:gap-12 lg:p-14">
            <div>
              <SectionBadge>Partnership</SectionBadge>
              <motion.h2
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="mt-4 text-2xl font-bold leading-tight text-white sm:text-3xl"
              >
                Growing Together Through{' '}
                <span className="text-[#3B82F6]">Strategic Partnerships</span>
              </motion.h2>
              <motion.p
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={0.1}
                className="mt-5 text-base leading-relaxed text-slate-300"
              >
                JowaBuzz Affiliate Program বিশ্বস্ত পার্টনারদের সাথে কাজ করে একটি শক্তিশালী
                নেটওয়ার্ক গড়ে তোলে। আমাদের সাথে যুক্ত হয়ে দীর্ঘমেয়াদি গ্রোথ, ট্রান্সপারেন্ট
                কমিশন এবং প্রিমিয়াম সাপোর্ট উপভোগ করুন।
              </motion.p>
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={0.2}
              >
                <Link
                  to="/affiliate/signup"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#2563EB] hover:shadow-[0_0_25px_rgba(59,130,246,0.35)]"
                >
                  Become a Partner
                  <ArrowRight size={18} />
                </Link>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative flex min-h-[240px] items-center justify-center rounded-2xl border border-white/5 bg-gradient-to-br from-[#020617] via-[#07132A] to-[#0f172a] p-8"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_50%)]" />
              <div className="relative text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3B82F6]/20 text-[#60A5FA]">
                  <Handshake size={32} />
                </div>
                <p className="text-lg font-bold text-white">Trusted Partnership Network</p>
                <p className="mt-2 text-sm text-slate-400">Scale your affiliate business with JowaBuzz</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
