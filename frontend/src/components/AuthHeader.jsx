import { Link } from 'react-router-dom';
import SiteLogo from './SiteLogo';
import { uiConfig } from '../config/uiConfig';
import { authColors } from '../config/authTheme';
export default function AuthHeader() {
  return (    <header
      className="fixed left-0 right-0 top-0 z-50 border-b"
      style={{
        height: uiConfig.headerHeight,
        backgroundColor: authColors.background,
        borderColor: authColors.border,
      }}
    >
      <div
        className="mx-auto flex h-full max-w-md items-center justify-between"
        style={{ paddingInline: uiConfig.spacing }}
      >
        <SiteLogo variant="auth" />
        <Link
          to="/"
          aria-label="Home"
          className="flex items-center justify-center rounded-md p-2 transition-colors duration-200 hover:bg-white/5"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 10.5L12 3.5L21 10.5V20C21 20.5523 20.5523 21 20 21H15V14H9V21H4C3.44772 21 3 20.5523 3 20V10.5Z"
              stroke={authColors.text}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </header>
  );
}
