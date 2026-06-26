import { AnimatePresence, motion } from 'framer-motion';
import { authColors } from '../config/authTheme';

export default function AuthToast({ message, type = 'success' }) {
  const isError = type === 'error';

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
          className="fixed left-1/2 top-4 z-[100] w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg"
          style={{
            backgroundColor: isError ? '#fef2f2' : authColors.card,
            borderColor: isError ? '#fecaca' : authColors.green,
            color: isError ? '#dc2626' : authColors.text,
            boxShadow: isError
              ? '0 8px 24px rgba(220, 38, 38, 0.15)'
              : '0 8px 24px rgba(24, 201, 110, 0.25)',
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
