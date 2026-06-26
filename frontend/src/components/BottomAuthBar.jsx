import { Link } from 'react-router-dom';
import { uiConfig } from '../config/uiConfig';
import { colors } from '../config/theme';

export default function BottomAuthBar() {
  const mobile = uiConfig.mobile;

  return (
    <div
      className="jb-mobile-bottom-bar fixed bottom-0 left-0 right-0 z-50 border-t px-2 py-1.5 lg:hidden"
      style={{
        height: mobile.bottomBarHeight,
        backgroundColor: colors.sectionBg,
        borderColor: colors.border,
      }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-stretch gap-1">
        <button
          type="button"
          className="jb-mobile-bottom-bar__lang flex shrink-0 items-center justify-center gap-1 px-2 text-[10px] font-semibold leading-none"
          style={{
            width: '30%',
            borderRadius: mobile.bottomButtonRadius,
          }}
        >
          <img
            src="/images/flag-bd.svg"
            alt="Bangladesh"
            className="h-3.5 w-3.5 rounded-full object-cover"
          />
          BDT বাংলা
        </button>

        <Link
          to="/auth?tab=signup"
          className="jb-mobile-bottom-bar__signup flex flex-1 items-center justify-center text-xs font-bold"
          style={{
            borderRadius: mobile.bottomButtonRadius,
          }}
        >
          সাইন আপ
        </Link>

        <Link
          to="/auth?tab=login"
          className="jb-mobile-bottom-bar__login flex flex-1 items-center justify-center text-xs font-bold"
          style={{
            borderRadius: mobile.bottomButtonRadius,
          }}
        >
          লগ ইন
        </Link>
      </div>
    </div>
  );
}
