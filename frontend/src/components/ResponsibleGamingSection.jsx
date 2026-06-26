import { responsibleGamingContent as content } from '../data/responsibleGamingContent';

function BulletList({ items }) {
  return (
    <ul className="site-footer__rg-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function ResponsibleGamingSection() {
  return (
    <section className="site-footer__rg" id="responsible-gaming" aria-labelledby="responsible-gaming-title">
      <div className="site-footer__rg-head">
        <h2 id="responsible-gaming-title" className="site-footer__rg-title">
          {content.title}
        </h2>
        <div className="site-footer__rg-divider" aria-hidden="true" />
      </div>

      <p className="site-footer__rg-text">{content.intro}</p>
      <BulletList items={content.tips} />

      <p className="site-footer__rg-text">{content.selfCheckIntro}</p>
      <BulletList items={content.selfCheckQuestions} />

      {content.sections.map((section) => (
        <article key={section.id} className="site-footer__rg-section">
          <h3 className="site-footer__rg-heading">{section.title}</h3>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="site-footer__rg-text">
              {paragraph}
            </p>
          ))}
          {section.list ? <BulletList items={section.list} /> : null}
        </article>
      ))}
    </section>
  );
}
