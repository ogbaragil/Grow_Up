import React, { useEffect } from "react";
import {
  ArrowRight,
  Check,
  Cloud,
  Database,
  Eye,
  Fingerprint,
  LineChart,
  Lock,
  Shield,
  Sparkles,
  Target,
  Telescope,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { PRO_LIMITS, SUPPORT_EMAIL } from "../config";

const PROOF_STATS = [
  { value: "16", label: "currencies" },
  { value: "5 min", label: "typical setup" },
  { value: "A$0", label: "to start" },
];

const PRINCIPLES = [
  [Shield, "No bank linking required", "You decide what to enter. Grow UP does not need your bank credentials to give you a useful financial picture."],
  [Database, "Manual by design", "A calmer relationship with money starts with intentional inputs, not another feed you barely understand."],
  [Cloud, "Backup when you want it", "Create an account for secure cloud backup and restore. Demo Mode stays read-only and safe to explore."],
  [Lock, "Private by default", "Your financial life deserves restraint: no unnecessary integrations, no forced data harvesting, no noise."],
];

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Net worth, finally visible",
    body: "See assets, debts, and month-by-month movement in a dashboard designed for clarity, not clutter.",
  },
  {
    icon: Target,
    title: "Goals with a timeline",
    body: "Track progress toward real milestones and estimate completion dates from your actual pace.",
  },
  {
    icon: Wallet,
    title: "Cash flow without the spreadsheet",
    body: "Model weekly, fortnightly, monthly, quarterly, yearly, and one-off money movement in one place.",
  },
  {
    icon: Telescope,
    title: "See the long view",
    body: "Use projections, snapshots, and compound scenarios to understand where today’s habits are heading.",
  },
];

const SHOWCASE = [
  ["01", "Monthly snapshots", "Capture assets, debts, and net worth over time so financial progress becomes visible instead of vague."],
  ["02", "Goal forecasting", "Estimate when you will reach each goal using historical pace, not wishful thinking."],
  ["03", "Wealth timeline", "Turn your financial future into a timeline you can inspect, adjust, and improve."],
];

const SCREENS = [
  ["/screenshots/overview.jpeg", "Overview dashboard showing net worth and progress"],
  ["/screenshots/goals.jpeg", "Goals screen with progress cards and forecasts"],
  ["/screenshots/cashflow.jpeg", "Cash flow screen showing recurring transactions"],
  ["/screenshots/assets-1.jpeg", "Assets and debts screen with account balances"],
];

function Reveal({ children, className = "", delay = 0, as: Tag = "div" }) {
  return (
    <Tag className={className} data-reveal style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

export function LandingPage() {
  const startSignup = () => {
    window.location.href = "/?auth=signup";
  };

  const startSignin = () => {
    window.location.href = "/?auth=signin";
  };

  const tryDemo = () => {
    localStorage.setItem("growup_demo_mode", "true");
    window.location.href = "/";
  };

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = document.querySelectorAll("[data-reveal]");

    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -60px 0px" }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine) return;

    const onMove = (event) => {
      document.documentElement.style.setProperty("--landing-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--landing-y", `${event.clientY}px`);
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div className="landing-page growup-worldclass">
      <div className="landing-ambient" aria-hidden="true" />

      <header className="landing-nav">
        <a className="landing-brand" href="/landingpage" aria-label="Grow UP landing page">
          <span className="landing-logo app-icon">
            <img src="/icons/growup-logo.png" alt="" />
          </span>
          <span>
            <b>Grow UP</b>
            <small>Personal Wealth OS</small>
          </span>
        </a>

        <nav>
          <a href="#features">Features</a>
          <a href="#demo">Demo</a>
          <a href="#pricing">Pricing</a>
          <a href="#privacy">Privacy</a>
        </nav>

        <button onClick={startSignin} className="landing-nav-cta">Sign in</button>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-copy hero-enter">
            <div className="hero-badge">
              <span />
              Wealth tracking without the noise
            </div>

            <h1>
              See the future your money is building.
            </h1>

            <p>
              Grow UP turns assets, debt, cash flow, goals, and long-term projections into one calm wealth dashboard — no bank logins, no spreadsheet rituals, no financial fog.
            </p>

            <div className="hero-actions">
              <button onClick={startSignup} className="primary-landing">
                Start free <ArrowRight size={18} strokeWidth={2.8} />
              </button>
              <button onClick={tryDemo} className="secondary-landing">Explore the demo</button>
            </div>

            <div className="trust-grid" aria-label="Grow UP trust indicators">
              {["No bank connection required", "Private by default", "Cloud backup when wanted", "Built for long-term progress"].map((item) => (
                <div key={item}>
                  <i><Check size={13} strokeWidth={3.5} /></i>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual hero-enter delayed" aria-label="Grow UP app preview">
            <div className="hero-orbit" aria-hidden="true" />
            <div className="hero-device-wrap">
              <div className="hero-device hero-phone-main">
                <img src="/screenshots/overview.jpeg" alt="Grow UP overview dashboard showing net worth and trends" />
              </div>
              <div className="hero-device hero-phone-secondary" aria-hidden="true">
                <img src="/screenshots/goals.jpeg" alt="" />
              </div>

              <div className="floating-chip float-soft">
                <small>Goal forecast</small>
                <strong>Debt free · 67%</strong>
              </div>

              <div className="floating-stat float-soft slower">
                <small>Monthly movement</small>
                <strong>+$2,430</strong>
                <span>On track this month</span>
              </div>
            </div>
          </div>
        </section>

        <Reveal className="proof-band">
          {PROOF_STATS.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </Reveal>

        <section className="landing-section intro-section">
          <Reveal className="section-heading">
            <span>Why Grow UP exists</span>
            <h2>Your money deserves a longer memory.</h2>
            <p>
              Most finance tools focus on today’s transactions. Grow UP focuses on the arc: what you own, what you owe, what is changing, and what future you are quietly creating.
            </p>
          </Reveal>

          <div className="principle-strip">
            {PRINCIPLES.map(([Icon, title, body], index) => (
              <Reveal as="article" key={title} delay={index * 70}>
                <div className="principle-icon"><Icon size={22} strokeWidth={2.4} /></div>
                <h3>{title}</h3>
                <p>{body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="features" className="landing-section feature-section">
          <Reveal className="section-heading">
            <span>What it brings together</span>
            <h2>A financial command centre, without the overwhelm.</h2>
            <p>
              Grow UP keeps the important things close: net worth, goals, debt momentum, recurring cash flow, historical snapshots, and long-term projections.
            </p>
          </Reveal>

          <div className="feature-grid">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Reveal as="article" key={feature.title} delay={index * 70}>
                  <div className="feature-icon"><Icon size={22} strokeWidth={2.4} /></div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="landing-section screens-section">
          <Reveal className="section-heading">
            <span>Real screens</span>
            <h2>The app, not a fantasy render.</h2>
            <p>
              The interface is deliberately calm: big numbers, clear cards, and enough structure to help you make better decisions without feeling buried in data.
            </p>
          </Reveal>

          <Reveal className="screens-stage">
            {SCREENS.map(([src, alt], index) => (
              <figure key={src} className={`screen-card screen-card-${index + 1}`}>
                <img src={src} alt={alt} loading="lazy" />
              </figure>
            ))}
          </Reveal>
        </section>

        <Reveal className="demo-conversion" id="demo" as="section">
          <div>
            <span>Interactive demo</span>
            <h2>Click around before you commit.</h2>
            <p>
              Demo Mode opens with realistic sample data and is fully read-only. Explore the dashboard, goals, accounts, history, and projections without creating an account.
            </p>
            <button onClick={tryDemo}>
              Open the interactive demo <ArrowRight size={18} strokeWidth={2.8} />
            </button>
          </div>
        </Reveal>

        <section className="product-showcase">
          <Reveal className="showcase-copy">
            <span>Built around momentum</span>
            <h2>Not another budget tracker.</h2>
            <p>
              Grow UP is for the person who wants to understand financial direction, not categorise every coffee. It is a wealth timeline, goal planner, and progress mirror in one.
            </p>
          </Reveal>

          <div className="showcase-cards">
            {SHOWCASE.map(([num, title, body], index) => (
              <Reveal as="article" key={num} delay={index * 70}>
                <b>{num}</b>
                <h3>{title}</h3>
                <p>{body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="pricing" className="landing-section pricing-section">
          <Reveal className="section-heading">
            <span>Pricing</span>
            <h2>Free to start. Simple to upgrade.</h2>
            <p>Begin with the free plan and upgrade only when your financial picture outgrows it.</p>
          </Reveal>

          <div className="pricing-grid">
            <Reveal as="article">
              <h3>Free</h3>
              <div className="price"><strong>A$0</strong><span>forever</span></div>
              <ul>
                <li><Check size={15} strokeWidth={3} /> Net worth dashboard</li>
                <li><Check size={15} strokeWidth={3} /> Up to {PRO_LIMITS.accounts} accounts</li>
                <li><Check size={15} strokeWidth={3} /> Up to {PRO_LIMITS.goals} goals</li>
                <li><Check size={15} strokeWidth={3} /> Up to {PRO_LIMITS.transactions} recurring transactions</li>
                <li><Check size={15} strokeWidth={3} /> {PRO_LIMITS.snapshotMonths} months of snapshot history</li>
                <li><Check size={15} strokeWidth={3} /> Compound calculator &amp; cloud backup</li>
              </ul>
              <button onClick={startSignup} className="secondary-landing">Start free</button>
            </Reveal>

            <Reveal as="article" className="featured" delay={80}>
              <em>Most popular</em>
              <h3>Pro</h3>
              <div className="price"><strong>A$3.99</strong><span>/month, or A$39.99/year</span></div>
              <ul>
                <li><Check size={15} strokeWidth={3} /> Everything in Free</li>
                <li><Check size={15} strokeWidth={3} /> Unlimited accounts, goals &amp; transactions</li>
                <li><Check size={15} strokeWidth={3} /> Full snapshot history</li>
                <li><Check size={15} strokeWidth={3} /> Insights — smart reads on your money</li>
                <li><Check size={15} strokeWidth={3} /> Wealth Timeline projections</li>
              </ul>
              <button onClick={startSignup} className="primary-landing">Start free, upgrade any time</button>
            </Reveal>
          </div>
        </section>

        <Reveal className="privacy-band" id="privacy" as="section">
          <div>
            <span><Fingerprint size={18} strokeWidth={2.5} /> Privacy posture</span>
            <h2>Designed for financial data people actually care about.</h2>
            <p>
              Grow UP does not force bank integrations. You control what you enter, what you back up, and when you restore saved data.
            </p>
          </div>

          <ul>
            <li><Eye size={16} /> No forced bank connections</li>
            <li><Shield size={16} /> Google Sign-In supported</li>
            <li><Cloud size={16} /> Cloud backup available</li>
            <li><Lock size={16} /> Read-only demo mode</li>
          </ul>
        </Reveal>

        <Reveal className="final-cta" as="section">
          <Sparkles size={22} strokeWidth={2.4} />
          <h2>Make progress visible.</h2>
          <p>Grow UP turns your financial life into something you can see clearly, revisit monthly, and improve deliberately.</p>
          <div>
            <button onClick={startSignup} className="primary-landing">Create free account</button>
            <button onClick={tryDemo} className="secondary-landing">Explore the demo</button>
          </div>
        </Reveal>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand" href="/landingpage">
          <span className="landing-logo app-icon"><img src="/icons/growup-logo.png" alt="" /></span>
          <span>
            <b>Grow UP</b>
            <small>© {new Date().getFullYear()}</small>
          </span>
        </a>

        <div>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms</a>
          <a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a>
        </div>
      </footer>
    </div>
  );
}
