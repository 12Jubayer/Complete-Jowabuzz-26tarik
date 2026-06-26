import { useCallback, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import AdminAccessDenied from '../../components/admin/AdminAccessDenied';
import AdminToast from '../../components/admin/AdminToast';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  ADMIN_PERMISSION_OPTIONS,
  buildEmptyPermissions,
  createAdminAccount,
  deleteSubAdmin,
  fetchAdminAccounts,
  updateSubAdminStatus,
} from '../../services/adminManageService';

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function statusBadgeClass(status) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'suspended') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function formatRole(role) {
  if (role === 'super_admin') return 'Super Admin';
  return 'Sub Admin';
}

function isSubAdmin(row) {
  return row.role !== 'super_admin';
}

function PermissionsEditor({ permissions, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ADMIN_PERMISSION_OPTIONS.map((item) => (
        <label
          key={item.key}
          className="flex items-center gap-2.5 text-sm font-medium text-[#111827]"
        >
          <input
            type="checkbox"
            checked={Boolean(permissions[item.key])}
            onChange={(event) =>
              onChange({ ...permissions, [item.key]: event.target.checked })
            }
            className="shrink-0 rounded border-slate-300"
          />
          <span className="text-[#111827]">{item.label}</span>
        </label>
      ))}
    </div>
  );
}

function DeleteConfirmModal({ admin, onClose, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Delete Sub Admin</h3>
          <button type="button" onClick={onClose} disabled={deleting}>
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold text-slate-900">{admin.name}</span>?
          This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddAdminModal({ onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    permissions: buildEmptyPermissions(),
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await createAdminAccount(form);
      showToast('Admin created successfully', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Add Admin</h3>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          {[
            ['name', 'Display name / Username', 'text'],
            ['email', 'Email', 'email'],
            ['password', 'Password', 'password'],
          ].map(([key, label, inputType]) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
              <input
                type={inputType}
                required
                value={form[key]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          ))}
          <div className="text-[#111827]">
            <span className="mb-2 block text-xs font-medium text-slate-500">Permissions</span>
            <PermissionsEditor
              permissions={form.permissions}
              onChange={(permissions) => setForm((current) => ({ ...current, permissions }))}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Admin'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminManagePage() {
  const { isSuperAdmin } = useAdminAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const [addOpen, setAddOpen] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebouncedValue(search);

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminAccounts({
        search: debouncedSearch,
        page,
        limit,
      });
      setRows(result.data || []);
      setTotal(Number(result.total || 0));
    } catch (error) {
      setRows([]);
      setTotal(0);
      showToast(error.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit, showToast]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    loadAdmins();
  }, [isSuperAdmin, loadAdmins]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleToggleStatus = async (row) => {
    const nextStatus = row.status === 'active' ? 'suspended' : 'active';
    setActionId(row.id);
    try {
      await updateSubAdminStatus(row.id, nextStatus);
      showToast(nextStatus === 'active' ? 'Sub admin activated' : 'Sub admin suspended', 'success');
      await loadAdmins();
    } catch (error) {
      showToast(error.message || 'Failed to update status');
    } finally {
      setActionId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSubAdmin(deleteTarget.id);
      showToast('Sub admin deleted successfully', 'success');
      setDeleteTarget(null);
      await loadAdmins();
    } catch (error) {
      showToast(error.message || 'Failed to delete sub admin');
    } finally {
      setDeleting(false);
    }
  };

  const showActionsColumn = isSuperAdmin;

  if (!isSuperAdmin) {
    return <AdminAccessDenied />;
  }

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Admin Manage</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isSuperAdmin
                ? 'Create and manage sub-admins. Permissions are assigned at creation time.'
                : 'View admin accounts. Only super admin can suspend or delete sub-admins.'}
            </p>
          </div>
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus size={16} />
              Add Admin
            </button>
          ) : null}
        </div>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          className="admin-filter-control w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none"
        />

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  {showActionsColumn ? <th className="px-4 py-3">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={showActionsColumn ? 5 : 4} className="px-4 py-12 text-center text-slate-400">
                      Loading admins...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={showActionsColumn ? 5 : 4} className="px-4 py-12 text-center text-slate-400">
                      No admins found
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="px-4 py-3 text-slate-600">{row.email}</td>
                      <td className="px-4 py-3 text-slate-700">{formatRole(row.role)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      {showActionsColumn ? (
                        <td className="px-4 py-3">
                          {isSubAdmin(row) ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={actionId === row.id || deleting}
                                onClick={() => handleToggleStatus(row)}
                                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                {actionId === row.id
                                  ? 'Saving...'
                                  : row.status === 'active'
                                    ? 'Suspend'
                                    : 'Activate'}
                              </button>
                              <button
                                type="button"
                                disabled={actionId === row.id || deleting}
                                onClick={() => setDeleteTarget(row)}
                                className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && total > 0 ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span>
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                >
                  Previous
                </button>
                <span>
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {addOpen ? (
        <AddAdminModal
          onClose={() => setAddOpen(false)}
          onSuccess={loadAdmins}
          showToast={showToast}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteConfirmModal
          admin={deleteTarget}
          onClose={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          deleting={deleting}
        />
      ) : null}
    </>
  );
}
