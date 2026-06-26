import { useCallback, useEffect, useState } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  deleteAdminAgentApplication,
  fetchAdminAgentApplications,
  updateAdminAgentApplicationStatus,
} from '../../services/adminAgentApplicationService';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All status' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function statusBadgeClass(status) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'rejected') return 'bg-red-50 text-red-600 border-red-200';
  if (status === 'contacted') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-cyan-50 text-cyan-700 border-cyan-200';
}

function statusLabel(status) {
  if (status === 'new') return 'New';
  if (status === 'contacted') return 'Contacted';
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return status;
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminAgentApplicationsPage() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = (message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminAgentApplications({
        status: status === 'all' ? '' : status,
        search,
        page,
        limit,
      });
      setRows(result.data || []);
      setTotal(Number(result.total || 0));
    } catch (error) {
      setRows([]);
      setTotal(0);
      showToast(error.message || 'Failed to load agent applications');
    } finally {
      setLoading(false);
    }
  }, [status, search, page, limit]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleStatusUpdate = async (id, nextStatus) => {
    setActionId(id);
    try {
      await updateAdminAgentApplicationStatus(id, nextStatus);
      showToast(`Marked as ${statusLabel(nextStatus)}`, 'success');
      await loadApplications();
      if (selected?.id === id) {
        setSelected((current) => (current ? { ...current, status: nextStatus } : null));
      }
    } catch (error) {
      showToast(error.message || 'Failed to update status');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this application?')) return;
    setActionId(id);
    try {
      await deleteAdminAgentApplication(id);
      showToast('Application deleted', 'success');
      if (selected?.id === id) setSelected(null);
      await loadApplications();
    } catch (error) {
      showToast(error.message || 'Failed to delete application');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Agent Applications</h2>
        <p className="mt-1 text-sm text-slate-500">
          Marketing landing page submissions from potential agents.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, phone..."
          className="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Telegram</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    Loading applications...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No applications found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                    <td className="px-4 py-3">{row.phone}</td>
                    <td className="px-4 py-3">{row.email}</td>
                    <td className="px-4 py-3">{row.country}</td>
                    <td className="px-4 py-3">{row.telegram || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(row.status)}`}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelected(row)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Eye size={14} className="inline" /> View
                        </button>
                        {row.status === 'new' ? (
                          <button
                            type="button"
                            disabled={actionId === row.id}
                            onClick={() => handleStatusUpdate(row.id, 'contacted')}
                            className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
                          >
                            Contacted
                          </button>
                        ) : null}
                        {row.status !== 'approved' ? (
                          <button
                            type="button"
                            disabled={actionId === row.id}
                            onClick={() => handleStatusUpdate(row.id, 'approved')}
                            className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800"
                          >
                            Approve
                          </button>
                        ) : null}
                        {row.status !== 'rejected' ? (
                          <button
                            type="button"
                            disabled={actionId === row.id}
                            onClick={() => handleStatusUpdate(row.id, 'rejected')}
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                          >
                            Reject
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={actionId === row.id}
                          onClick={() => handleDelete(row.id)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600"
                        >
                          <Trash2 size={14} className="inline" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} of {totalPages} · {total} total
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selected.name}</h3>
                <p className="text-sm text-slate-500">{formatDateTime(selected.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-md border border-slate-200 px-2 py-1 text-sm"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Email:</span> {selected.email}
              </p>
              <p>
                <span className="font-semibold">Phone:</span> {selected.phone}
              </p>
              <p>
                <span className="font-semibold">Country:</span> {selected.country}
              </p>
              <p>
                <span className="font-semibold">Telegram:</span> {selected.telegram || '—'}
              </p>
              <p>
                <span className="font-semibold">Status:</span> {statusLabel(selected.status)}
              </p>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold text-slate-800">Message</p>
                <p className="mt-1 whitespace-pre-wrap">{selected.message || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <AdminToast message={toast} type={toastType} />
    </div>
  );
}
