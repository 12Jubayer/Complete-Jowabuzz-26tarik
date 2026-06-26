import { useCallback, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  adjustAdminPlayerBalance,
  changeAdminPlayerPassword,
  createAdminPlayer,
  deleteAdminPlayer,
  fetchAdminPlayerInfo,
  fetchAdminPlayers,
  updateAdminPlayerStatus,
  updateAdminPlayerWithdrawBlock,
  updateAdminPlayerWithdrawChannel,
} from '../../services/adminPlayerService';
import { isSuperAdmin } from '../../utils/adminPermissions';

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function statusBadgeClass(status) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'suspended') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function PlayerInfoModal({ playerId, onClose, showToast }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [withdrawChannel, setWithdrawChannel] = useState('');
  const [savingChannel, setSavingChannel] = useState(false);
  const admin = JSON.parse(localStorage.getItem('jowabuzz_admin') || 'null');
  const canEditChannel = isSuperAdmin(admin);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAdminPlayerInfo(playerId)
      .then((data) => {
        if (active) {
          setInfo(data);
          setWithdrawChannel(data.withdrawChannel || '');
        }
      })
      .catch((error) => showToast(error.message || 'Failed to load player info'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [playerId, showToast]);

  const handlePasswordUpdate = async () => {
    if (password.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await changeAdminPlayerPassword(playerId, password);
      showToast('Password updated successfully', 'success');
      setPassword('');
    } catch (error) {
      showToast(error.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleWithdrawChannelUpdate = async () => {
    if (!withdrawChannel) {
      showToast('Select AGENT or PAYMENT');
      return;
    }
    setSavingChannel(true);
    try {
      const result = await updateAdminPlayerWithdrawChannel(playerId, withdrawChannel);
      showToast('Withdraw channel updated', 'success');
      const refreshed = await fetchAdminPlayerInfo(playerId);
      setInfo(refreshed);
      setWithdrawChannel(refreshed.withdrawChannel || result.withdrawChannel || '');
    } catch (error) {
      showToast(error.message || 'Failed to update withdraw channel');
    } finally {
      setSavingChannel(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#0f172a] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-lg font-semibold">Player Info</h3>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-16 text-center text-white/60">Loading player info...</div>
        ) : info ? (
          <div className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Name', info.name],
                ['Phone', info.phone],
                ['Email', info.email || '—'],
                ['Role', info.role],
                ['Status', info.status],
                ['Balance', `৳${formatMoney(info.balance)}`],
                ['Account Created', new Date(info.createdAt).toLocaleString()],
                ['Last Login', info.lastLogin ? new Date(info.lastLogin).toLocaleString() : '—'],
                ['Last Login IP', info.lastLoginIp || '—'],
                ['Withdraw Channel', info.withdrawChannel || 'Not set'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
                  <div className="mt-1 text-sm font-medium capitalize">{value}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Total Deposit', info.totalDeposit, 'border-emerald-400'],
                ['Total Withdraw', info.totalWithdraw, 'border-amber-400'],
                ['Total Win', info.totalWin, 'border-cyan-400'],
                ['Total Loss', info.totalLoss, 'border-violet-400'],
              ].map(([label, amount, borderClass]) => (
                <div
                  key={label}
                  className={`rounded-lg border-t-4 bg-white/5 px-3 py-3 ${borderClass}`}
                >
                  <div className="text-xs text-white/60">{label}</div>
                  <div className="mt-1 text-lg font-semibold">৳{formatMoney(amount)}</div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-white/80">
                Betting History (latest 100)
              </h4>
              <div className="overflow-hidden rounded-lg border border-white/10">
                <table className="min-w-full text-xs">
                  <thead className="bg-white/5 text-left text-white/50">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Game</th>
                      <th className="px-3 py-2">Bet</th>
                      <th className="px-3 py-2">Payout</th>
                      <th className="px-3 py-2">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!info.bettingHistory?.length ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-white/40">
                          No bets
                        </td>
                      </tr>
                    ) : (
                      info.bettingHistory.map((row, index) => (
                        <tr key={`${row.date}-${index}`} className="border-t border-white/10">
                          <td className="px-3 py-2">{new Date(row.date).toLocaleString()}</td>
                          <td className="px-3 py-2">{row.game}</td>
                          <td className="px-3 py-2">৳{formatMoney(row.bet)}</td>
                          <td className="px-3 py-2">৳{formatMoney(row.payout)}</td>
                          <td className="px-3 py-2 capitalize">{row.result}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {canEditChannel ? (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-white/80">Withdraw Channel (Super Admin)</h4>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={withdrawChannel}
                    onChange={(event) => setWithdrawChannel(event.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                  >
                    <option value="">Not set</option>
                    <option value="AGENT">AGENT</option>
                    <option value="PAYMENT">PAYMENT</option>
                  </select>
                  <button
                    type="button"
                    disabled={savingChannel}
                    onClick={handleWithdrawChannelUpdate}
                    className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
                  >
                    Save Channel
                  </button>
                </div>
                {info.withdrawChannelLogs?.length ? (
                  <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
                    <table className="min-w-full text-xs">
                      <thead className="bg-white/5 text-left text-white/50">
                        <tr>
                          <th className="px-3 py-2">Time</th>
                          <th className="px-3 py-2">Old</th>
                          <th className="px-3 py-2">New</th>
                          <th className="px-3 py-2">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {info.withdrawChannelLogs.map((log) => (
                          <tr key={log.id} className="border-t border-white/10">
                            <td className="px-3 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                            <td className="px-3 py-2">{log.oldChannel || '—'}</td>
                            <td className="px-3 py-2">{log.newChannel || '—'}</td>
                            <td className="px-3 py-2">{log.changeSource}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              <h4 className="mb-2 text-sm font-semibold text-white/80">Change Password</h4>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="New password (min 6)"
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                />
                <button
                  type="button"
                  disabled={savingPassword}
                  onClick={handlePasswordUpdate}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  Update
                </button>
              </div>
            </div>

            <div className="flex justify-end border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DeletePlayerModal({ player, onClose, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Delete Player</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Are you sure you want to permanently delete this player?
        </p>
        <p className="mt-2 text-sm font-medium text-slate-800">{player.name}</p>
        <p className="mt-1 text-xs text-slate-500">
          User ID: #{player.id}
          {player.userUid ? ` · ${player.userUid}` : ''}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BalanceAdjustModal({ player, onClose, onSuccess, showToast }) {
  const [type, setType] = useState('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await adjustAdminPlayerBalance(player.id, {
        type,
        amount: Number(amount),
        reason,
      });
      showToast('Balance updated successfully', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to adjust balance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Adjust Balance</h3>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          {player.name} — current balance ৳{formatMoney(player.balance)}
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Type</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="add">Add</option>
              <option value="deduct">Deduct</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Reason</span>
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Update Balance'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddPlayerModal({ onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({ name: '', phone: '', password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await createAdminPlayer(form);
      showToast('Player created successfully', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to create player');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Add Player</h3>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          {[
            ['name', 'Name', 'text'],
            ['phone', 'Phone', 'tel'],
            ['password', 'Password', 'password'],
            ['confirmPassword', 'Confirm Password', 'password'],
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
            {submitting ? 'Creating...' : 'Create Player'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminPlayersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const [infoPlayerId, setInfoPlayerId] = useState(null);
  const [balancePlayer, setBalancePlayer] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [deletePlayer, setDeletePlayer] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebouncedValue(search);

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminPlayers({
        search: debouncedSearch,
        page,
        limit,
      });
      setRows(result.data || []);
      setTotal(Number(result.total || 0));
    } catch (error) {
      setRows([]);
      setTotal(0);
      showToast(error.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit, showToast]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleToggleStatus = async (player) => {
    setActionId(player.id);
    const nextStatus = player.status === 'active' ? 'suspended' : 'active';
    try {
      await updateAdminPlayerStatus(player.id, nextStatus);
      showToast(nextStatus === 'active' ? 'Player activated' : 'Player suspended', 'success');
      await loadPlayers();
    } catch (error) {
      showToast(error.message || 'Failed to update status');
    } finally {
      setActionId(null);
    }
  };

  const handleToggleWithdrawBlock = async (player) => {
    setActionId(player.id);
    const nextBlocked = !player.withdrawBlocked;
    try {
      await updateAdminPlayerWithdrawBlock(player.id, nextBlocked);
      showToast(
        nextBlocked ? 'Withdraw blocked for this player' : 'Withdraw approved for this player',
        'success',
      );
      await loadPlayers();
    } catch (error) {
      showToast(error.message || 'Failed to update withdraw block');
    } finally {
      setActionId(null);
    }
  };

  const handleDeletePlayer = async () => {
    if (!deletePlayer) return;
    setDeleting(true);
    try {
      const playerId = Number(deletePlayer.id);
      if (!playerId) {
        throw new Error('Invalid player id');
      }
      const result = await deleteAdminPlayer(playerId);
      showToast(
        `Player #${result.userId} deleted (${result.deletedRows} row removed)`,
        'success',
      );
      setDeletePlayer(null);
      await fetchAdminPlayers({ search: debouncedSearch, page, limit, _refresh: Date.now() }).then(
        (listResult) => {
          setRows(listResult.data || []);
          setTotal(Number(listResult.total || 0));
        },
      );
    } catch (error) {
      showToast(error.message || 'Failed to delete player');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Player</h2>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus size={16} />
            Add Player
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, phone, email, user id"
          className="admin-filter-control w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none"
        />

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Loading players...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      No players found
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{row.name}</div>
                        <div className="text-xs text-slate-400">{row.identifier}</div>
                      </td>
                      <td className="px-4 py-3 capitalize">{row.role}</td>
                      <td className="px-4 py-3 font-semibold">৳{formatMoney(row.balance)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setInfoPlayerId(row.id)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Info
                          </button>
                          <button
                            type="button"
                            onClick={() => setBalancePlayer(row)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            ± Balance
                          </button>
                          <button
                            type="button"
                            disabled={actionId === row.id || row.status === 'deleted'}
                            onClick={() => handleToggleStatus(row)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {row.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            disabled={actionId === row.id || row.status === 'deleted'}
                            onClick={() => handleToggleWithdrawBlock(row)}
                            className={`rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                              row.withdrawBlocked
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            {row.withdrawBlocked ? 'Withdraw Approve' : 'Withdraw Block'}
                          </button>
                          <button
                            type="button"
                            disabled={actionId === row.id}
                            onClick={() => setDeletePlayer(row)}
                            className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
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

      {infoPlayerId ? (
        <PlayerInfoModal
          playerId={infoPlayerId}
          onClose={() => setInfoPlayerId(null)}
          showToast={showToast}
        />
      ) : null}

      {deletePlayer ? (
        <DeletePlayerModal
          player={deletePlayer}
          onClose={() => setDeletePlayer(null)}
          onConfirm={handleDeletePlayer}
          deleting={deleting}
        />
      ) : null}

      {balancePlayer ? (
        <BalanceAdjustModal
          player={balancePlayer}
          onClose={() => setBalancePlayer(null)}
          onSuccess={loadPlayers}
          showToast={showToast}
        />
      ) : null}

      {addOpen ? (
        <AddPlayerModal
          onClose={() => setAddOpen(false)}
          onSuccess={loadPlayers}
          showToast={showToast}
        />
      ) : null}
    </>
  );
}
