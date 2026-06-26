import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchPublicHomepageSliders } from '../services/siteSliderService';

const FALLBACK_SLIDERS = [
  {
    id: 'fallback-1',
    title: 'Welcome Bonus 100%',
    imageUrl: '/images/banner-1.png',
    linkUrl: '/auth?tab=signup',
  },
  {
    id: 'fallback-2',
    title: 'Aviator Crash Game',
    imageUrl: '/images/banner-2.png',
    linkUrl: '/',
  },
  {
    id: 'fallback-3',
    title: 'Live Casino',
    imageUrl: '/images/banner-3.png',
    linkUrl: '/',
  },
];

function dedupeSliders(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    const imageKey = String(item.imageUrl || '').trim().toLowerCase();
    const key = imageKey || String(item.id || '').trim();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getWebpSource(url = '') {
  const value = String(url || '').trim();
  if (!value || value.endsWith('.webp')) return null;
  if (value.startsWith('/uploads/')) return null;
  if (/\.(png|jpe?g)$/i.test(value)) {
    return value.replace(/\.(png|jpe?g)$/i, '.webp');
  }
  return null;
}

function SliderImage({ slider, isActive }) {
  const webpSrc = getWebpSource(slider.imageUrl);

  if (webpSrc) {
    return (
      <picture>
        <source srcSet={webpSrc} type="image/webp" />
        <img
          src={slider.imageUrl}
          alt={slider.title || 'Homepage banner'}
          className="jb-mobile-hero__image"
          loading={isActive ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={isActive ? 'high' : 'auto'}
        />
      </picture>
    );
  }

  return (
    <img
      src={slider.imageUrl}
      alt={slider.title || 'Homepage banner'}
      className="jb-mobile-hero__image"
      loading={isActive ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={isActive ? 'high' : 'auto'}
    />
  );
}

function SliderSlide({ slider, isActive }) {
  const image = <SliderImage slider={slider} isActive={isActive} />;

  const content = slider.linkUrl ? (
    /^https?:\/\//i.test(slider.linkUrl) ? (
      <a
        href={slider.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="jb-mobile-hero__link"
      >
        {image}
      </a>
    ) : (
      <Link to={slider.linkUrl} className="jb-mobile-hero__link">
        {image}
      </Link>
    )
  ) : (
    <div className="jb-mobile-hero__link">{image}</div>
  );

  return (
    <div
      className={`jb-mobile-hero__slide ${isActive ? 'jb-mobile-hero__slide--active' : ''}`}
    >
      {content}
    </div>
  );
}

export default function HeroSlider() {
  const [sliders, setSliders] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const loadSliders = useCallback(async () => {
    try {
      const data = await fetchPublicHomepageSliders();
      const nextSliders = dedupeSliders(data?.length ? data : FALLBACK_SLIDERS);
      setSliders(nextSliders);
      setActiveIndex(0);
    } catch {
      setSliders(dedupeSliders(FALLBACK_SLIDERS));
    }
  }, []);

  useEffect(() => {
    loadSliders();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadSliders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadSliders]);

  useEffect(() => {
    if (activeIndex >= sliders.length && sliders.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, sliders.length]);

  useEffect(() => {
    if (sliders.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % sliders.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [sliders.length]);

  const goToSlide = (index) => {
    setActiveIndex(index);
  };

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + sliders.length) % sliders.length);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % sliders.length);
  };

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0]?.clientX || 0;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (event) => {
    const currentX = event.touches[0]?.clientX || 0;
    touchDeltaX.current = touchStartX.current - currentX;
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) < 42) return;
    if (touchDeltaX.current > 0) {
      goNext();
    } else {
      goPrev();
    }
  };

  if (!sliders.length) {
    return null;
  }

  return (
    <section className="jb-mobile-hero jb-mcw-hero">
      <div className="jb-mobile-hero__container">
        <div
          className="jb-mobile-hero__frame"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {sliders.map((slider, index) => (
            <SliderSlide
              key={`${slider.id}-${slider.imageUrl}`}
              slider={slider}
              isActive={index === activeIndex}
            />
          ))}

          {sliders.length > 1 ? (
            <>
              <button
                type="button"
                className="jb-mobile-hero__arrow jb-mobile-hero__arrow--prev"
                aria-label="Previous banner"
                onClick={goPrev}
              >
                <ChevronLeft size={22} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className="jb-mobile-hero__arrow jb-mobile-hero__arrow--next"
                aria-label="Next banner"
                onClick={goNext}
              >
                <ChevronRight size={22} strokeWidth={2.2} />
              </button>
              <div className="jb-mobile-hero__dots">
                {sliders.map((slider, index) => (
                  <button
                    key={slider.id}
                    type="button"
                    aria-label={`Go to slide ${index + 1}`}
                    onClick={() => goToSlide(index)}
                    className={`jb-mobile-hero__dot ${
                      index === activeIndex ? 'jb-mobile-hero__dot--active' : ''
                    }`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
