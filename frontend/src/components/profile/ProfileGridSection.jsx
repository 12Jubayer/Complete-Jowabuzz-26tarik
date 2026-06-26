export default function ProfileGridSection({ title, items }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-blue-500" />
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            disabled={item.disabled}
            className={`flex flex-col items-center gap-2 rounded-xl px-1 py-2 text-center transition-colors ${
              item.disabled
                ? 'cursor-not-allowed opacity-50'
                : 'hover:bg-slate-50 active:bg-slate-100'
            }`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              {item.icon}
            </span>
            <span className="text-[11px] font-medium leading-tight text-slate-700">{item.label}</span>
            {item.hint ? (
              <span className="text-[10px] leading-tight text-red-500">{item.hint}</span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
