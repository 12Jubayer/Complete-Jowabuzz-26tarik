import { aboutUsContent as content } from '../data/aboutUsContent';

export default function AboutUsSection() {
  return (
    <section className="info-page-section" aria-labelledby="about-us-title">
      <div className="info-page-section__head">
        <h1 id="about-us-title" className="info-page-section__title">
          {content.title}
        </h1>
        <div className="info-page-section__divider" aria-hidden="true" />
      </div>

      <div className="info-page-section__body">
        {content.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="info-page-section__text">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
