import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthToast from '../../components/AuthToast';
import SiteLogo from '../../components/SiteLogo';
import { submitAgentApplication } from '../../services/agentApplicationService';
import '../../styles/agentLanding.css';

const NAV_ITEMS = [
  { id: 'hero', label: 'Home' },
  { id: 'who-is-agent', label: 'Who is Agent' },
  { id: 'how-to-become', label: 'How to Become' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'income', label: 'Income' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
];

const STEPS = [
  {
    title: 'Submit your application',
    text: 'Fill out the contact form with your name, email, phone, country, and Telegram username.',
  },
  {
    title: 'Verification and review',
    text: 'Our team reviews your application and contacts you with the next steps for agent onboarding.',
  },
  {
    title: 'Start earning commission',
    text: 'After approval, help players with deposits and withdrawals and earn commission on transactions.',
  },
];

const OPPORTUNITIES = [
  {
    icon: '💰',
    title: 'Stable income thanks to commission from the platform',
  },
  {
    icon: '⏰',
    title: 'Opportunity to earn money around the clock',
  },
  {
    icon: '🌐',
    title: 'Build your own local agent network over time',
  },
  {
    icon: '🛡️',
    title: 'Safe work with transparent transaction records',
  },
];

const FAQ_ITEMS = [
  {
    question: 'How much can you earn as a JowaBuzz agent?',
    answer:
      'Your income depends on transaction volume. Agents earn commission on eligible player deposits and withdrawals handled through the agent channel.',
  },
  {
    question: 'What commission percentage do agents receive?',
    answer:
      'Commission rates are configured by the platform. Use the income estimator on this page for a rough monthly projection based on daily volume.',
  },
  {
    question: 'Who pays the commission to the agent?',
    answer:
      'Commission is paid by the platform based on verified transactions completed through your agent account.',
  },
  {
    question: 'How often are agent commissions paid?',
    answer:
      'Settlement frequency depends on platform policy. Approved agents receive details from the management team during onboarding.',
  },
];

const COUNTRIES = [
  'Bangladesh',
  'India',
  'Pakistan',
  'Nepal',
  'Other',
];

const INITIAL_FORM = {
  name: '',
  email: '',
  country: 'Bangladesh',
  phone: '',
  telegram: '',
  message: '',
};

function scrollToSection(id) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export default function AgentMarketingLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [dailyVolume, setDailyVolume] = useState(50);
  const [operationalDays, setOperationalDays] = useState(26);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const estimatedCommission = useMemo(() => {
    const totalRate = 0.1;
    return Math.round(dailyVolume * operationalDays * totalRate);
  }, [dailyVolume, operationalDays]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 4000);
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await submitAgentApplication(form);
      showToast(
        result.message ||
          'Application submitted successfully. Our team will contact you soon.',
      );
      setForm(INITIAL_FORM);
    } catch (error) {
      showToast(error.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="agent-landing">
      <header className="agent-landing__header">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="shrink-0">
            <SiteLogo variant="desktop" linkTo={null} />
          </Link>

          <nav className="agent-landing__nav" aria-label="Agent landing navigation">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 lg:hidden"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-white/10 px-4 py-3 lg:hidden">
            <div className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    scrollToSection(item.id);
                    setMenuOpen(false);
                  }}
                  className="rounded-lg px-3 py-2 text-left text-sm font-semibold uppercase tracking-wide text-white/90 hover:bg-white/5"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <section id="hero" className="agent-landing__hero agent-landing__section">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 agent-landing__hero-grid">
          <div>
            <h1 className="agent-landing__title">
              Become a JowaBuzz Agent
              <br />
              and Earn Money
            </h1>
            <p className="agent-landing__subtitle">
              Join the JowaBuzz agent program and help players with deposits and withdrawals while
              earning commission on every eligible transaction. Build a flexible income stream with
              local payment support across Bangladesh.
            </p>
            <button
              type="button"
              className="agent-landing__cta"
              onClick={() => scrollToSection('who-is-agent')}
            >
              <span>Who is Agent?</span>
            </button>
          </div>

          <div className="agent-landing__hero-card">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              Agent Program
            </p>
            <p className="mt-3 text-2xl font-bold uppercase leading-tight">
              Earn commission on player transactions
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• bKash, Nagad, Rocket support</li>
              <li>• Transparent transaction history</li>
              <li>• Dedicated onboarding support</li>
              <li>• Flexible working hours</li>
            </ul>
            <button
              type="button"
              className="agent-landing__cta mt-5 w-full justify-center"
              onClick={() => scrollToSection('contact')}
            >
              <span>Apply Now</span>
            </button>
          </div>
        </div>
      </section>

      <section id="who-is-agent" className="agent-landing__section agent-landing__section--panel">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="agent-landing__section-title">Who is an Agent</h2>
          <p className="agent-landing__section-lead mx-auto mt-4">
            A JowaBuzz agent is a trusted local partner who helps players complete deposits and
            withdrawals using popular mobile banking methods. Agents earn commission for verified
            transactions while providing fast, reliable support to players in their region.
          </p>
          <button
            type="button"
            className="agent-landing__cta mt-8"
            onClick={() => scrollToSection('contact')}
          >
            <span>Become an Agent</span>
          </button>
        </div>
      </section>

      <section id="how-to-become" className="agent-landing__section">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="agent-landing__section-title">How to Become an Agent</h2>
          <p className="agent-landing__section-lead">
            To become a JowaBuzz agent, complete these three simple steps:
          </p>
          <div className="agent-landing__steps">
            {STEPS.map((step, index) => (
              <div key={step.title} className="agent-landing__step">
                <div className="agent-landing__step-num">
                  <span>{index + 1}</span>
                </div>
                <div>
                  <h3 className="agent-landing__step-title">{step.title}</h3>
                  <p className="agent-landing__step-text">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="opportunities" className="agent-landing__section agent-landing__section--panel">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="agent-landing__section-title">Opportunities</h2>
          <p className="agent-landing__section-lead">What brings profit to a JowaBuzz agent?</p>
          <div className="agent-landing__cards">
            {OPPORTUNITIES.map((item) => (
              <div key={item.title} className="agent-landing__card">
                <div className="agent-landing__card-icon">{item.icon}</div>
                <h3 className="agent-landing__card-title">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="income" className="agent-landing__section">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="agent-landing__section-title">Estimate Your Income</h2>
          <p className="agent-landing__section-lead">
            Based on daily transaction volume (8% + 2% commission estimate)
          </p>
          <div className="agent-landing__calculator">
            <div className="agent-landing__calc-box space-y-5">
              <div>
                <div className="agent-landing__calc-label">
                  <span>Daily Volume (৳)</span>
                  <span>{dailyVolume.toLocaleString('en-BD')}৳</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="50000"
                  step="50"
                  value={dailyVolume}
                  onChange={(event) => setDailyVolume(Number(event.target.value))}
                  className="agent-landing__range"
                />
              </div>
              <div>
                <div className="agent-landing__calc-label">
                  <span>Operational Days</span>
                  <span>{operationalDays}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={operationalDays}
                  onChange={(event) => setOperationalDays(Number(event.target.value))}
                  className="agent-landing__range"
                />
              </div>
            </div>
            <div className="agent-landing__calc-box agent-landing__calc-result">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                Your Estimated Commission
              </p>
              <p className="agent-landing__calc-amount">৳{estimatedCommission.toLocaleString('en-BD')}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Monthly</p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="agent-landing__section agent-landing__section--panel">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="agent-landing__section-title">F.A.Q.</h2>
          <div className="mt-4">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={item.question} className="agent-landing__faq-item">
                  <button
                    type="button"
                    className="agent-landing__faq-button"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                  >
                    <span>{item.question}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen ? <p className="agent-landing__faq-answer">{item.answer}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="contact" className="agent-landing__section">
        <div className="mx-auto max-w-6xl px-4">
          <div className="agent-landing__contact-grid">
            <div>
              <h2 className="agent-landing__section-title">Contacts</h2>
              <p className="agent-landing__section-lead mt-3">
                Ready to join? Submit your application and our team will contact you soon.
              </p>
              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <p>
                  <span className="font-semibold text-white">Website:</span> jowabuzz.com
                </p>
                <p>
                  <span className="font-semibold text-white">Support:</span> Apply through the form
                </p>
              </div>
            </div>

            <form className="agent-landing__form" onSubmit={handleSubmit}>
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-sky-300">
                Submit Your Application
              </h3>

              <div className="mt-4 grid gap-0 sm:grid-cols-2 sm:gap-x-4">
                <div className="agent-landing__field">
                  <label htmlFor="agent-name">Name *</label>
                  <input
                    id="agent-name"
                    value={form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    required
                  />
                </div>
                <div className="agent-landing__field">
                  <label htmlFor="agent-email">Email *</label>
                  <input
                    id="agent-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    required
                  />
                </div>
                <div className="agent-landing__field">
                  <label htmlFor="agent-country">Country *</label>
                  <select
                    id="agent-country"
                    value={form.country}
                    onChange={(event) => updateField('country', event.target.value)}
                    required
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="agent-landing__field">
                  <label htmlFor="agent-phone">Phone *</label>
                  <input
                    id="agent-phone"
                    value={form.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    required
                  />
                </div>
                <div className="agent-landing__field sm:col-span-2">
                  <label htmlFor="agent-telegram">Telegram Username / Nickname</label>
                  <input
                    id="agent-telegram"
                    value={form.telegram}
                    onChange={(event) => updateField('telegram', event.target.value)}
                    placeholder="@username"
                  />
                </div>
                <div className="agent-landing__field sm:col-span-2">
                  <label htmlFor="agent-message">Message</label>
                  <textarea
                    id="agent-message"
                    value={form.message}
                    onChange={(event) => updateField('message', event.target.value)}
                    placeholder="Tell us about your experience or preferred working area"
                  />
                </div>
              </div>

              <button type="submit" disabled={submitting} className="agent-landing__submit">
                <span>{submitting ? 'Submitting...' : 'Submit'}</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="agent-landing__footer">
        <div className="mx-auto max-w-7xl px-4">
          <p>© {new Date().getFullYear()} JowaBuzz. Agent marketing landing page.</p>
          <p className="mt-2">
            <Link to="/" className="text-sky-300 hover:text-sky-200">
              Back to main site
            </Link>
          </p>
        </div>
      </footer>

      <AuthToast message={toast} />
    </div>
  );
}
