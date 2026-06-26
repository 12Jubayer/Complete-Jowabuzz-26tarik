import { useMemo, useState } from 'react';
import { faqCategories, faqContent as content } from '../data/faqContent';

export default function FaqSection() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [openQuestionId, setOpenQuestionId] = useState(null);

  const filteredQuestions = useMemo(() => {
    if (activeCategory === 'all') return content.questions;
    return content.questions.filter((question) => question.category === activeCategory);
  }, [activeCategory]);

  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
    setOpenQuestionId(null);
  };

  const toggleQuestion = (questionId) => {
    setOpenQuestionId((current) => (current === questionId ? null : questionId));
  };

  return (
    <section className="info-page-section faq-page-section" aria-labelledby="faq-title">
      <div className="info-page-section__head">
        <p className="info-page-section__subtitle">{content.subtitle}</p>
        <h1 id="faq-title" className="info-page-section__title">
          {content.title}
        </h1>
        <div className="info-page-section__divider" aria-hidden="true" />
      </div>

      <div className="info-page-section__body info-page-section__body--left">
        <p className="info-page-section__text">{content.intro}</p>

        <div className="faq-page__categories" role="tablist" aria-label="FAQ categories">
          {faqCategories.map((category) => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`faq-page__category${isActive ? ' faq-page__category--active' : ''}`}
                onClick={() => handleCategoryChange(category.id)}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        <ul className="faq-page__questions">
          {filteredQuestions.map((question) => {
            const isOpen = openQuestionId === question.id;
            const answerId = `${question.id}-answer`;

            return (
              <li key={question.id} className={`faq-page__item${isOpen ? ' faq-page__item--open' : ''}`}>
                <button
                  id={question.id}
                  type="button"
                  className="faq-page__question"
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => toggleQuestion(question.id)}
                >
                  <span className="faq-page__question-text">{question.text}</span>
                  <span className="faq-page__question-icon" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen ? (
                  <div id={answerId} className="faq-page__answer" role="region" aria-labelledby={question.id}>
                    <p>{question.answer}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
