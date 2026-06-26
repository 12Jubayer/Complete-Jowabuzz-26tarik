import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import SectionBadge from './SectionBadge';
import { COMMISSION_TIERS } from './constants';
import { fadeUp } from './motion';

export default function AffiliateLandingCommission() {
  const [revenue, setRevenue] = useState(100000);
  const [rate, setRate] = useState(25);

  const estimated = useMemo(() => Math.round((revenue * rate) / 100), [revenue, rate]);

  return (
    <section id="commission" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <SectionBadge>Commission</SectionBadge>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-4 text-2xl font-bold text-white sm:text-3xl"
          >
            Commission <span className="text-[#3B82F6]">Calculator</span>
          </motion.h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="rounded-2xl border border-white/5 bg-[#07132A] p-6 sm:p-8"
          >
            <h3 className="text-lg font-bold text-white">Live Calculation</h3>

            <label className="mt-6 block">
              <span className="text-sm text-slate-400">Player Revenue (৳)</span>
              <input
                type="number"
                min={0}
                value={revenue}
                onChange={(e) => setRevenue(Number(e.target.value) || 0)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#020617] px-4 py-3 text-white outline-none focus:border-[#3B82F6]"
              />
            </label>

            <label className="mt-5 block">
              <span className="text-sm text-slate-400">Commission Rate (%)</span>
              <input
                type="range"
                min={10}
                max={25}
                step={5}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="mt-3 w-full accent-[#3B82F6]"
              />
              <p className="mt-2 text-sm font-semibold text-[#60A5FA]">{rate}%</p>
            </label>

            <div className="mt-8 rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/10 p-5">
              <p className="text-sm text-slate-300">Estimated Earnings</p>
              <motion.p
                key={estimated}
                initial={{ scale: 0.95, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-1 text-3xl font-bold text-[#22C55E]"
              >
                ৳{estimated.toLocaleString()}
              </motion.p>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0.1}
            className="rounded-2xl border border-white/5 bg-[#07132A] p-6 sm:p-8"
          >
            <h3 className="text-lg font-bold text-white">
              Commission <span className="text-[#3B82F6]">Structure</span>
            </h3>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="pb-3 font-medium">Tier</th>
                    <th className="pb-3 text-right font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {COMMISSION_TIERS.map((row, i) => (
                    <motion.tr
                      key={row.tier}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className="border-b border-white/5 text-white"
                    >
                      <td className="py-3.5">{row.tier}</td>
                      <td className="py-3.5 text-right font-semibold text-[#60A5FA]">
                        {row.rate}%
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-white/5 bg-[#020617]/60 p-4">
                <p className="text-sm font-semibold text-white">Net Profit</p>
                <p className="mt-1 text-xs text-slate-400">
                  (Player Activity - Deductions - Bonus)
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-[#020617]/60 p-4">
                <p className="text-sm font-semibold text-white">Commission</p>
                <p className="mt-1 text-xs text-slate-400">Net Profit × Commission Rate</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
