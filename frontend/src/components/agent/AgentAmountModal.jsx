export default function AgentAmountModal({
  open,
  title,
  submitLabel,
  loading = false,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const amount = formData.get('amount');
    onSubmit(amount);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">Enter the amount in BDT (৳)</p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <input
            name="amount"
            type="number"
            min="1"
            step="0.01"
            required
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {loading ? 'Submitting...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
