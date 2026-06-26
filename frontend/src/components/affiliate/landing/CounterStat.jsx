import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { fadeUp } from './motion';

function useCountUp(target, duration = 1800, active = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return undefined;

    let frame;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.floor(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, active]);

  return value;
}

export default function CounterStat({ label, value, prefix = '', suffix = '', index = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const count = useCountUp(value, 1800, inView);

  return (
    <motion.div
      ref={ref}
      custom={index * 0.1}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#07132A] p-5 transition-all duration-300 hover:border-[#3B82F6]/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] sm:p-6"
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#3B82F6]/10 blur-2xl transition-all group-hover:bg-[#3B82F6]/20" />
      <p className="text-2xl font-bold text-white sm:text-3xl">
        {prefix}
        {count.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-slate-400">{label}</p>
    </motion.div>
  );
}
