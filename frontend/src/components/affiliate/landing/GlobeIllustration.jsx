import { motion } from 'framer-motion';

export default function GlobeIllustration() {
  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#3B82F6]/20 via-cyan-500/10 to-transparent blur-3xl" />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        className="relative h-[85%] w-[85%] rounded-full border border-[#3B82F6]/20"
      >
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-0 h-full w-px origin-bottom bg-gradient-to-b from-[#3B82F6]/40 to-transparent"
            style={{ transform: `rotate(${i * 22.5}deg)` }}
          />
        ))}
        {[...Array(5)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-transparent via-[#60A5FA]/30 to-transparent"
            style={{ transform: `translateY(${(i - 2) * 18}%)` }}
          />
        ))}
        <div className="absolute inset-[15%] rounded-full border border-cyan-400/20" />
        <div className="absolute inset-[30%] rounded-full border border-[#3B82F6]/15" />
        {[12, 28, 55, 72, 88].map((top, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
            className="absolute h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
            style={{ top: `${top}%`, left: `${20 + i * 14}%` }}
          />
        ))}
      </motion.div>
    </div>
  );
}
