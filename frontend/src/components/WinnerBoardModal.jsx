import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, Gift, List, Timer, X } from 'lucide-react';
import LogoLoader from './LogoLoader';
import { useAuth } from '../context/AuthContext';
import {
  fetchFirstToReach,
  fetchWinnerBoardLeaderboard,
  fetchWinnerBoards,
  formatWinnerAmount,
} from '../services/winnerBoardService';

const NEON = '#22c55e';

function useCountdown(targetIso) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => {
    const end = new Date(targetIso || Date.now()).getTime();
    const diff = Math.max(0, end - now);
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  }, [now, targetIso]);
}

function CrownIcon({ tone = 'gold' }) {
  const colors = {
    gold: NEON,
    silver: '#cbd5e1',
    bronze: '#d97706',
  };

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 18H20L18 8L14 11L12 5L10 11L6 8L4 18Z"
        fill={colors[tone] || colors.gold}
        stroke={colors[tone] || colors.gold}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RewardBadge({ value }) {
  return (
    <div className="winner-board__reward-badge">
      <Gift size={12} strokeWidth={2.2} />
      <span>{Number(value || 0).toLocaleString('en-IN')}</span>
    </div>
  );
}

function PodiumCard({ entry, variant }) {
  if (!entry) return null;

  const toneMap = {
    first: 'gold',
    second: 'silver',
    third: 'bronze',
  };

  return (
    <article className={`winner-board__podium-card winner-board__podium-card--${variant}`}>
      <div className="winner-board__podium-crown">
        <CrownIcon tone={toneMap[variant]} />
      </div>
      <div className="winner-board__podium-game">
        <img src={entry.gameImage} alt={entry.gameName} loading="lazy" />
      </div>
      <p className="winner-board__podium-user">{entry.username}</p>
      <p className="winner-board__podium-amount">{formatWinnerAmount(entry.amount)}</p>
      <RewardBadge value={entry.rewardPoints} />
    </article>
  );
}

function LeaderboardRow({ entry }) {
  return (
    <article className="winner-board__list-row">
      <div className="winner-board__list-rank">{entry.rank}</div>
      <div className="winner-board__list-game">
        <img src={entry.gameImage} alt={entry.gameName} loading="lazy" />
        <span>{entry.gameName}</span>
      </div>
      <div className="winner-board__list-meta">
        <span>{entry.username}</span>
        <strong>{formatWinnerAmount(entry.amount)}</strong>
      </div>
    </article>
  );
}

function EmptyFirstToReach() {
  return (
    <div className="winner-board__empty">
      <div className="winner-board__empty-art" aria-hidden="true">
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
          <rect x="24" y="18" width="48" height="58" rx="6" fill="#334155" />
          <rect x="30" y="24" width="36" height="46" rx="3" fill="#475569" />
          <rect x="36" y="32" width="24" height="3" rx="1.5" fill="#64748b" />
          <rect x="36" y="40" width="18" height="3" rx="1.5" fill="#64748b" />
          <rect x="36" y="48" width="20" height="3" rx="1.5" fill="#64748b" />
          <circle cx="72" cy="24" r="4" fill="#64748b" opacity="0.7" />
          <circle cx="18" cy="34" r="3" fill="#64748b" opacity="0.5" />
          <circle cx="76" cy="58" r="3" fill="#64748b" opacity="0.45" />
        </svg>
      </div>
      <p>No Record</p>
    </div>
  );
}

export default function WinnerBoardModal({ open, onClose }) {
  const { loggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [period, setPeriod] = useState('daily');
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [firstToReach, setFirstToReach] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const countdown = useCountdown(leaderboard?.periodEndsAt);

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    setLoadingBoards(true);

    fetchWinnerBoards()
      .then((data) => {
        if (!active) return;
        setBoards(data);
        setSelectedBoardId((current) => current || data[0]?.id || null);
      })
      .finally(() => {
        if (active) setLoadingBoards(false);
      });

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !selectedBoardId) return undefined;

    let active = true;
    setLoadingLeaderboard(true);

    fetchWinnerBoardLeaderboard({ boardId: selectedBoardId, period })
      .then((data) => {
        if (!active) return;
        setLeaderboard(data);
      })
      .finally(() => {
        if (active) setLoadingLeaderboard(false);
      });

    return () => {
      active = false;
    };
  }, [open, selectedBoardId, period]);

  useEffect(() => {
    if (!open || !selectedBoardId || activeTab !== 'first-to-reach') return undefined;

    let active = true;

    fetchFirstToReach({ boardId: selectedBoardId })
      .then((data) => {
        if (!active) return;
        setFirstToReach(data);
      })
      .catch(() => {
        if (!active) return;
        setFirstToReach([]);
      });

    return () => {
      active = false;
    };
  }, [open, selectedBoardId, activeTab]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const selectedBoard = boards.find((board) => board.id === selectedBoardId) || boards[0] || leaderboard?.board;
  const podiumFirst = leaderboard?.podium?.find((entry) => entry.rank === 1);
  const podiumSecond = leaderboard?.podium?.find((entry) => entry.rank === 2);
  const podiumThird = leaderboard?.podium?.find((entry) => entry.rank === 3);

  return (
    <div className="winner-board-overlay" role="presentation" onClick={onClose}>
      <div
        className="winner-board-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Winner Board"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="winner-board__header">
          <h2>Winner Board</h2>
          <button type="button" className="winner-board__close" onClick={onClose} aria-label="Close winner board">
            <X size={22} strokeWidth={2.2} />
          </button>
        </header>

        <div className="winner-board__tabs">
          <button
            type="button"
            className={`winner-board__tab ${activeTab === 'leaderboard' ? 'winner-board__tab--active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            Leader Board
          </button>
          <button
            type="button"
            className={`winner-board__tab ${activeTab === 'first-to-reach' ? 'winner-board__tab--active' : ''}`}
            onClick={() => setActiveTab('first-to-reach')}
          >
            First To Reach
          </button>
        </div>

        <div className="winner-board__body">
          {activeTab === 'leaderboard' ? (
            <>
              <div className="winner-board__board-select">
                <button
                  type="button"
                  className="winner-board__board-select-btn"
                  onClick={() => setDropdownOpen((value) => !value)}
                >
                  <span>{selectedBoard?.title || 'Slots Leaderboard'}</span>
                  <ChevronDown size={16} strokeWidth={2.4} />
                </button>
                {dropdownOpen && boards.length > 1 ? (
                  <div className="winner-board__board-dropdown">
                    {boards.map((board) => (
                      <button
                        key={board.id}
                        type="button"
                        onClick={() => {
                          setSelectedBoardId(board.id);
                          setDropdownOpen(false);
                        }}
                      >
                        {board.title}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="winner-board__banner">
                <div className="winner-board__banner-art" aria-hidden="true" />
                <p>SLOTS LEADERBOARD</p>
              </div>

              <div className="winner-board__date-bar">
                <div className="winner-board__date-range">
                  <Calendar size={14} strokeWidth={2.2} />
                  <span>
                    {selectedBoard?.startDate || '2026/02/09'} - {selectedBoard?.endDate || '2026/12/31'}
                  </span>
                </div>
                <div className="winner-board__date-actions">
                  <button type="button" aria-label="Rewards">
                    <Gift size={14} strokeWidth={2.2} />
                  </button>
                  <button type="button" aria-label="Rules">
                    <List size={14} strokeWidth={2.2} />
                  </button>
                </div>
              </div>

              <div className="winner-board__section-head">
                <span className="winner-board__section-accent" aria-hidden="true" />
                <h3>Leader Board</h3>
              </div>

              <div className="winner-board__period-tabs">
                <button
                  type="button"
                  className={period === 'daily' ? 'is-active' : ''}
                  onClick={() => setPeriod('daily')}
                >
                  Daily
                </button>
                <button
                  type="button"
                  className={period === 'weekly' ? 'is-active' : ''}
                  onClick={() => setPeriod('weekly')}
                >
                  Weekly
                </button>
              </div>

              <div className="winner-board__countdown">
                <Timer size={16} strokeWidth={2.2} />
                <div className="winner-board__countdown-grid">
                  <div>
                    <strong>{countdown.days}</strong>
                    <span>day</span>
                  </div>
                  <span className="winner-board__countdown-sep">:</span>
                  <div>
                    <strong>{countdown.hours}</strong>
                    <span>hr</span>
                  </div>
                  <span className="winner-board__countdown-sep">:</span>
                  <div>
                    <strong>{countdown.minutes}</strong>
                    <span>min</span>
                  </div>
                  <span className="winner-board__countdown-sep">:</span>
                  <div>
                    <strong>{countdown.seconds}</strong>
                    <span>sec</span>
                  </div>
                </div>
              </div>

              {loadingBoards || loadingLeaderboard ? (
                <div className="winner-board__loading">
                  <LogoLoader size="md" label="Loading leaderboard" />
                </div>
              ) : (
                <>
                  <div className="winner-board__podium">
                    <PodiumCard entry={podiumSecond} variant="second" />
                    <PodiumCard entry={podiumFirst} variant="first" />
                    <PodiumCard entry={podiumThird} variant="third" />
                  </div>

                  <div className="winner-board__list">
                    {(leaderboard?.entries || []).map((entry) => (
                      <LeaderboardRow key={`${entry.rank}-${entry.username}`} entry={entry} />
                    ))}
                  </div>
                </>
              )}

              {!loggedIn ? <p className="winner-board__login-note">Log in now to check your ranking!</p> : null}
            </>
          ) : firstToReach.length ? (
            <div className="winner-board__first-list">
              {firstToReach.map((entry) => (
                <article key={entry.id} className="winner-board__first-card">
                  <div>
                    <p className="winner-board__first-title">{entry.title}</p>
                    <p className="winner-board__first-target">{formatWinnerAmount(entry.targetAmount)}</p>
                  </div>
                  <div className="winner-board__first-meta">
                    {entry.gameImage ? <img src={entry.gameImage} alt={entry.gameName || ''} /> : null}
                    <span>{entry.username || 'Pending'}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyFirstToReach />
          )}
        </div>
      </div>
    </div>
  );
}
