import CounterStat from './CounterStat';
import { STATS } from './constants';

export default function AffiliateLandingStats() {
  return (
    <section className="relative border-y border-white/5 bg-[#07132A]/40 py-10 sm:py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 sm:px-6 lg:grid-cols-4 lg:gap-6">
        {STATS.map((stat, i) => (
          <CounterStat key={stat.label} {...stat} index={i} />
        ))}
      </div>
    </section>
  );
}
