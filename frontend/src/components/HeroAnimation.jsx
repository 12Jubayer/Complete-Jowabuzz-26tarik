import { uiConfig } from '../config/uiConfig';
import { authColors } from '../config/authTheme';

export default function HeroAnimation() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        height: uiConfig.bannerHeight,
        background: `linear-gradient(135deg, ${authColors.background} 0%, #122018 45%, #241012 100%)`,
      }}
    >
      <div
        className="relative mx-auto flex h-full max-w-md items-center justify-between"
        style={{ paddingInline: uiConfig.spacing }}
      >
        <div className="z-10">
          <p
            className="text-2xl font-semibold leading-tight"
            style={{ color: authColors.text }}
          >
            Hello
          </p>
          <p
            className="mt-1 text-xl font-bold leading-tight"
            style={{ color: authColors.text }}
          >
            Welcome to Jowabuzz
          </p>
        </div>

        {/* Replace this container with Lottie / GIF / MP4 / custom animation later */}
        <div
          className="relative flex shrink-0 items-center justify-center overflow-hidden"
          style={{
            width: uiConfig.bannerHeight * 0.85,
            height: uiConfig.bannerHeight * 0.85,
            borderRadius: uiConfig.radius,
            backgroundColor: authColors.card,
            border: `1px solid ${authColors.border}`,
          }}
        >
          <video
            className="h-full w-full object-cover"
            src="/videos/auth-hero.mp4"
            autoPlay
            loop
            muted
            playsInline
            aria-label="Jowabuzz welcome animation"
          />
        </div>
      </div>
    </section>
  );
}
