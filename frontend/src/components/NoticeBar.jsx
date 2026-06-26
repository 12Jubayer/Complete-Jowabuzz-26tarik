import { useEffect, useState } from 'react';
import { fetchPublicNoticeConfig } from '../services/siteNoticeService';

export default function NoticeBar() {
  const [notice, setNotice] = useState({ enabled: true, text: 'Welcome to JowaBuzz!' });

  useEffect(() => {
    let active = true;
    fetchPublicNoticeConfig()
      .then((data) => {
        if (active) {
          setNotice({
            enabled: Boolean(data.enabled),
            text: String(data.text || '').trim(),
          });
        }
      })
      .catch(() => {
        // keep default notice on failure
      });
    return () => {
      active = false;
    };
  }, []);

  if (!notice.enabled || !notice.text) {
    return null;
  }

  const noticeText = notice.text;

  return (
    <section className="jb-mobile-notice overflow-hidden border-y lg:py-2.5">
      <div className="flex min-h-[32px] items-center gap-2 px-3 lg:min-h-0 lg:gap-3 lg:px-4">
        <span
          className="jb-notice-icon flex shrink-0 items-center justify-center lg:rounded-md lg:p-1.5"
          aria-hidden="true"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="lg:h-[18px] lg:w-[18px]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 10.5V14.5C3 15.6 3.9 16.5 5 16.5H6.2L10.8 20.4C11.5 21 12.5 20.5 12.5 19.6V4.4C12.5 3.5 11.5 3 10.8 3.6L6.2 7.5H5C3.9 7.5 3 8.4 3 9.5V10.5Z"
              fill="currentColor"
            />
            <path
              d="M16 8.5C17.1 9.8 17.8 11.3 17.8 12.8C17.8 14.3 17.1 15.8 16 17.1"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M19 6.5C20.8 8.5 21.9 10.9 21.9 13.5C21.9 16.1 20.8 18.5 19 20.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="jb-notice-marquee">
            <span className="jb-notice-text">{noticeText}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
