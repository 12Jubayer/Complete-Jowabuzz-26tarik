import { motion } from 'framer-motion';
import { authColors } from '../config/authTheme';

const tabs = [
  { id: 'login', label: 'Log in' },
  { id: 'signup', label: 'Sign up' },
];

export default function AuthTabs({ activeTab, onChange }) {
  return (
    <div
      className="border-b"
      style={{
        backgroundColor: authColors.background,
        borderColor: authColors.border,
      }}
    >
      <div className="mx-auto flex max-w-md">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className="relative flex-1 py-3.5 text-sm transition-colors duration-200"
              style={{
                color: isActive ? authColors.text : authColors.gray,
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId="auth-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[3px]"
                  style={{ backgroundColor: authColors.green }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
