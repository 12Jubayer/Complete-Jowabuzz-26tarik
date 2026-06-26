import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  createAdminChatFaq,
  deleteAdminChatFaq,
  fetchAdminChatFaqs,
  fetchAdminChatSettings,
  saveAdminChatSettings,
  updateAdminChatFaq,
} from '../../services/adminChatFaqService';

const EMPTY_FAQ = {
  question: '',
  answer: '',
  sortOrder: 0,
  isActive: true,
};

function Field({ label, children }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default function AdminChatSettingsPanel({
  enabled,
  onEnabledChange,
  onToast,
  inputClassName = () =>
    'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400',
}) {
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FAQ);
  const [editingId, setEditingId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const onEnabledChangeRef = useRef(onEnabledChange);
  const onToastRef = useRef(onToast);

  useEffect(() => {
    onEnabledChangeRef.current = onEnabledChange;
    onToastRef.current = onToast;
  }, [onEnabledChange, onToast]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [settings, faqList] = await Promise.all([
        fetchAdminChatSettings(),
        fetchAdminChatFaqs(),
      ]);
      setFallbackMessage(settings.fallbackMessage || '');
      onEnabledChangeRef.current?.(settings.enabled !== false);
      setFaqs(Array.isArray(faqList) ? faqList : []);
    } catch (error) {
      const message = error.message || 'Failed to load chat settings';
      setLoadError(message);
      onToastRef.current?.(message, 'error');
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await saveAdminChatSettings({
        enabled,
        fallbackMessage,
      });
      onToastRef.current?.('Chat settings saved', 'success');
      await load();
    } catch (error) {
      onToastRef.current?.(error.message || 'Failed to save chat settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFaq = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      onToastRef.current?.('Question and answer are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      if (editingId) {
        await updateAdminChatFaq(editingId, payload);
        onToastRef.current?.('FAQ updated', 'success');
      } else {
        await createAdminChatFaq(payload);
        onToastRef.current?.('FAQ added', 'success');
      }
      setForm(EMPTY_FAQ);
      setEditingId(null);
      await load();
    } catch (error) {
      onToastRef.current?.(error.message || 'Failed to save FAQ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFaq = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await deleteAdminChatFaq(id);
      onToastRef.current?.('FAQ deleted', 'success');
      if (editingId === id) {
        setEditingId(null);
        setForm(EMPTY_FAQ);
      }
      await load();
    } catch (error) {
      onToastRef.current?.(error.message || 'Failed to delete FAQ', 'error');
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading chat settings...</p>;
  }

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Retry
          </button>
        </div>
      ) : null}
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange?.(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600"
        />
        <div>
          <p className="text-sm font-medium text-slate-800">Enable live chat on main site</p>
          <p className="text-xs text-slate-500">When disabled, users will not see the chat widget.</p>
        </div>
      </label>

      <Field label="Fallback message (custom user question)">
        <textarea
          rows={3}
          value={fallbackMessage}
          onChange={(e) => setFallbackMessage(e.target.value)}
          className={inputClassName()}
          placeholder="দয়া করে অপেক্ষা করুন..."
        />
      </Field>

      <button
        type="button"
        onClick={handleSaveSettings}
        disabled={saving}
        className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Save chat settings'}
      </button>

      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">FAQ quick replies</h3>
            <p className="text-xs text-slate-500">Shown in live chat popup for instant answers.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(EMPTY_FAQ);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
          >
            <Plus size={14} />
            Add FAQ
          </button>
        </div>

        <div className="mb-4 grid gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
          <Field label="FAQ question">
            <input
              type="text"
              value={form.question}
              onChange={(e) => setForm((s) => ({ ...s, question: e.target.value }))}
              className={inputClassName()}
            />
          </Field>
          <Field label="Sort order">
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((s) => ({ ...s, sortOrder: e.target.value }))}
              className={inputClassName()}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="FAQ answer">
              <textarea
                rows={3}
                value={form.answer}
                onChange={(e) => setForm((s) => ({ ...s, answer: e.target.value }))}
                className={inputClassName()}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
            />
            Active
          </label>
          <div className="flex justify-end md:col-span-2">
            <button
              type="button"
              onClick={handleSaveFaq}
              disabled={saving}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {editingId ? 'Update FAQ' : 'Add FAQ'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {faqs.length === 0 ? (
            <p className="text-sm text-slate-500">No FAQs yet.</p>
          ) : (
            faqs.map((faq) => (
              <div
                key={faq.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{faq.question}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{faq.answer}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Order {faq.sortOrder} · {faq.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(faq.id);
                      setForm({
                        question: faq.question,
                        answer: faq.answer,
                        sortOrder: faq.sortOrder,
                        isActive: faq.isActive,
                      });
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFaq(faq.id)}
                    className="rounded-lg border border-red-100 px-2 py-1.5 text-red-600 hover:bg-red-50"
                    aria-label="Delete FAQ"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
