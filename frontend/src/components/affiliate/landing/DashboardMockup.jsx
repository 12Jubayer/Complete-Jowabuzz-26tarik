import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Wallet } from 'lucide-react';

const MINI_STATS = [
  { icon: Users, label: 'Referrals', value: '248' },
  { icon: Wallet, label: 'Balance', value: '৳12,450' },
  { icon: TrendingUp, label: 'Commission', value: '৳3,200' },
  { icon: BarChart3, label: 'Deposits', value: '৳85K' },
];

export default function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40, rotateY: -8 }}
      whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-lg"
    >
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#3B82F6]/30 via-cyan-500/10 to-indigo-600/20 blur-2xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#07132A]/90 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <p className="text-xs text-slate-400">Affiliate Dashboard</p>
            <p className="text-lg font-bold text-white">JowaBuzz Panel</p>
          </div>
          <span className="rounded-full bg-[#22C55E]/20 px-3 py-1 text-xs font-medium text-[#22C55E]">
            Live
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {MINI_STATS.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-white/5 bg-[#020617]/60 p-3 transition-colors hover:border-[#3B82F6]/30"
            >
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6]/15 text-[#60A5FA]">
                <Icon size={16} />
              </div>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-sm font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-white/5 bg-[#020617]/60 p-4">
          <div className="mb-3 flex items-end justify-between gap-2">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                whileInView={{ height: `${h}%` }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.5 }}
                className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-[#3B82F6] to-cyan-400"
                style={{ height: `${h}%`, minHeight: 24 }}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400">Weekly Performance Overview</p>
        </div>
      </div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-4 top-1/4 hidden h-14 w-14 rounded-2xl border border-[#3B82F6]/30 bg-[#07132A] shadow-lg sm:block"
      />
      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-2 bottom-8 hidden h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400/40 to-[#3B82F6]/40 blur-sm sm:block"
      />
    </motion.div>
  );
}
