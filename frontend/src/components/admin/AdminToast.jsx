import { AnimatePresence, motion } from 'framer-motion';

export default function AdminToast({ message, type = 'error' }) {
  const isError = type === 'error';

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
          className={[
            'fixed left-1/2 top-4 z-[100] w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg',
            isError
              ? 'border-red-200 bg-white text-red-600'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700',
          ].join(' ')}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
