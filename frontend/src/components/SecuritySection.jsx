import { securityContent as content } from '../data/securityContent';

function InfoList({ items }) {
  return (
    <ul className="info-page-section__list">
      {items.map((item) => (
        <li key={item.slice(0, 32)}>{item}</li>
      ))}
    </ul>
  );
}

export default function SecuritySection() {
  return (
    <section className="info-page-section" aria-labelledby="security-title">
      <div className="info-page-section__head">
        <p className="info-page-section__subtitle">{content.subtitle}</p>
        <h1 id="security-title" className="info-page-section__title">
          {content.title}
        </h1>
        <div className="info-page-section__divider" aria-hidden="true" />
      </div>

      <div className="info-page-section__body info-page-section__body--left">
        {content.intro.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="info-page-section__text">
            {paragraph}
          </p>
        ))}

        {content.sections.map((section) => (
          <article key={section.id} className="info-page-section__article">
            <h2 className="info-page-section__heading">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="info-page-section__text">
                {paragraph}
              </p>
            ))}
            {section.items ? <InfoList items={section.items} /> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
