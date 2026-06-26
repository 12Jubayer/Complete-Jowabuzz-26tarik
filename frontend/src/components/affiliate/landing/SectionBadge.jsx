import { motion } from 'framer-motion';
import { fadeUp } from './motion';

export default function SectionBadge({ children }) {
  return (
    <motion.span
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.6 }}
      className="inline-block rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#60A5FA]"
    >
      {children}
    </motion.span>
  );
}
