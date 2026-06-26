import { AnimatePresence, motion } from 'framer-motion';
import { authColors } from '../config/authTheme';
import { uiConfig } from '../config/uiConfig';

function ProfileRow({ label, value }) {
  return (
    <div
      className="rounded-lg border px-3 py-2.5"
      style={{
        backgroundColor: authColors.input,
        borderColor: authColors.border,
      }}
    >
      <p className="text-xs" style={{ color: authColors.gray }}>
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold" style={{ color: authColors.text }}>
        {value}
      </p>
    </div>
  );
}

export default function ProfileModal({ open, onClose, user, onLogout }) {
  if (!user) return null;

  const formattedPhone = user.phone
    ? `+880 ${user.phone}`
    : 'N/A';

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close profile"
            className="fixed inset-0 z-[70] bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-x-4 bottom-24 z-[80] mx-auto max-w-md rounded-2xl border p-4 shadow-2xl md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2"
            style={{
              backgroundColor: authColors.card,
              borderColor: authColors.border,
            }}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: authColors.text }}>
                My Profile
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 transition-colors hover:bg-white/5"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6L18 18M18 6L6 18"
                    stroke={authColors.gray}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <ProfileRow label="Name" value={user.username} />
              <ProfileRow label="Phone" value={formattedPhone} />
              <ProfileRow
                label="Balance"
                value={`${Number(user.balance ?? 0).toFixed(2)} ${user.currency || 'BDT'}`}
              />
              <ProfileRow label="Referral Code" value={user.referralCode || 'N/A'} />
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 w-full text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.99]"
              style={{
                height: uiConfig.buttonHeight,
                borderRadius: uiConfig.radius,
                backgroundColor: authColors.green,
                color: authColors.text,
                boxShadow: '0 8px 24px rgba(24, 201, 110, 0.28)',
              }}
            >
              Logout
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
