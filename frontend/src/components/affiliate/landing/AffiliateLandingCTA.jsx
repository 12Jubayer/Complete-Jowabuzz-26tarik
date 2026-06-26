import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Mail } from 'lucide-react';
import { fadeUp } from './motion';

export default function AffiliateLandingCTA() {
  const scrollToContact = () => {
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-[#3B82F6]/20 bg-gradient-to-r from-[#07132A] via-[#0c1a3a] to-[#07132A] p-8 sm:p-12 lg:p-16"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.25),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(34,211,238,0.15),transparent_50%)]" />

          <div className="relative text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              আজই Affiliate Program-এ যোগ দিন
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">
              প্রিমিয়াম ট্র্যাকিং, নিরাপদ পেমেন্ট এবং দ্রুত সাপোর্ট — সবকিছু এক জায়গায়।
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/affiliate/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/30 transition-all hover:bg-[#2563EB]"
              >
                Join Now
                <ArrowRight size={18} />
              </Link>
              <button
                type="button"
                onClick={scrollToContact}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:border-[#3B82F6]/40"
              >
                <Mail size={18} />
                Contact Us
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
