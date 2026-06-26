import { Link } from 'react-router-dom';
import { privacyPolicyContent as content } from '../data/privacyPolicyContent';

function InfoList({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="info-page-section__list">
      {items.map((item) => (
        <li key={item.slice(0, 32)}>{item}</li>
      ))}
    </ul>
  );
}

function SubSectionBlock({ subSection }) {
  return (
    <div className="info-page-section__sub-block">
      {subSection.subheading ? (
        <h3 className="info-page-section__subheading">{subSection.subheading}</h3>
      ) : null}
      {subSection.paragraphs?.map((paragraph) => (
        <p key={paragraph.slice(0, 32)} className="info-page-section__text">
          {paragraph}
        </p>
      ))}
      {subSection.leadIn ? (
        <p className="info-page-section__text">{subSection.leadIn}</p>
      ) : null}
      <InfoList items={subSection.items} />
      {subSection.leadIn2 ? (
        <p className="info-page-section__text">{subSection.leadIn2}</p>
      ) : null}
      <InfoList items={subSection.items2} />
    </div>
  );
}

export default function PrivacyPolicySection() {
  return (
    <section className="info-page-section" aria-labelledby="privacy-policy-title">
      <div className="info-page-section__head">
        <p className="info-page-section__subtitle">{content.subtitle}</p>
        <h1 id="privacy-policy-title" className="info-page-section__title">
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
                {section.id === 'cookies' ? (
                  <>
                    JowaBuzz uses cookies to ensure our website works efficiently and to enhance your visits to our
                    platforms. Further information can be found in our Cookie Policy on the{' '}
                    <Link to="/security" className="info-page-section__link">
                      Security
                    </Link>{' '}
                    page.
                  </>
                ) : (
                  paragraph
                )}
              </p>
            ))}
            <InfoList items={section.items} />
            {section.subSections?.map((subSection) => (
              <SubSectionBlock key={subSection.subheading || subSection.paragraphs?.[0]?.slice(0, 24)} subSection={subSection} />
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
