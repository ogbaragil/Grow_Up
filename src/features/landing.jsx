import React, { useEffect } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Cloud,
  Database,
  EyeOff,
  Fingerprint,
  LineChart,
  Lock,
  Shield,
  Target,
  Wallet,
} from "lucide-react";
import { PRO_LIMITS, SUPPORT_EMAIL } from "../config";

const screens = {
  overview: ["/screenshots/overview.jpeg", "Grow UP overview dashboard with net worth and monthly movement"],
  goals: ["/screenshots/goals.jpeg", "Grow UP goals screen with progress timelines"],
  cashflow: ["/screenshots/cashflow.jpeg", "Grow UP cash flow screen with income, expenses, and surplus"],
  assets: ["/screenshots/assets-1.jpeg", "Grow UP assets and debts screen with balances"],
};

const story = [
  {
    eyebrow: "01 · Overview",
    title: "Net worth that stays visible.",
    body: "Your assets, debts, and monthly movement stay in one calm view — clear enough to revisit every month.",
    image: screens.overview,
  },
  {
    eyebrow: "02 · Goals",
    title: "Milestones with real timelines.",
    body: "Track what you are building toward and estimate dates from actual pace, not wishful thinking.",
    image: screens.goals,
  },
  {
    eyebrow: "03 · Cash flow",
    title: "Future money, without a spreadsheet.",
    body: "Model income, expenses, recurring transactions, and surplus without handing over bank credentials.",
    image: screens.cashflow,
  },
  {
    eyebrow: "04 · Assets & debts",
    title: "A monthly record you can trust.",
    body: "Update balances, add notes, and build a financial memory that is easier to inspect over time.",
    image: screens.assets,
  },
];

const principles = [
  [Shield, "No forced bank linking", "Grow UP does not need your bank credentials to be useful."],
  [Database, "Manual by design", "Intentional inputs create a calmer relationship with money."],
  [Cloud, "Backup when wanted", "Create an account only when you want cloud backup and restore."],
  [Lock, "Private by default", "No transaction scraping, no surveillance finance, no unnecessary data grab."],
];

function Reveal({ children, className = "", delay = 0, as: Tag = "div", id }) {
  return (
    <Tag id={id} className={className} data-reveal style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

function AppButton({ children, variant = "primary", onClick }) {
  return (
    <button onClick={onClick} className={`gwu-btn gwu-${variant}`}>
      {children}
    </button>
  );
}

function Device({ src, alt, className = "" }) {
  return (
    <figure className={`gwu-device ${className}`}>
      <img src={src} alt={alt} loading="lazy" />
    </figure>
  );
}

function HeroVisual() {
  return (
    <div className="gwu-hero-visual" aria-label="Grow UP product preview">
      <Device src={screens.goals[0]} alt="" className="gwu-hero-phone gwu-hero-phone-left" />
      <Device src={screens.overview[0]} alt="Grow UP overview dashboard" className="gwu-hero-phone gwu-hero-phone-main" />
      <Device src={screens.assets[0]} alt="" className="gwu-hero-phone gwu-hero-phone-right" />
      <div className="gwu-insight-card gwu-insight-one">
        <span>Net worth</span>
        <strong>$93,400</strong>
        <em>+$1,823 this month</em>
      </div>
      <div className="gwu-insight-card gwu-insight-two">
        <span>Goal forecast</span>
        <strong>Debt free · 67%</strong>
      </div>
    </div>
  );
}

export function LandingPage() {
  const startSignup = () => { window.location.href = "/?auth=signup"; };
  const startSignin = () => { window.location.href = "/?auth=signin"; };
  const tryDemo = () => { localStorage.setItem("growup_demo_mode", "true"); window.location.href = "/"; };

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = document.querySelectorAll("[data-reveal]");
    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-revealed"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -80px 0px" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine) return;
    const move = (event) => {
      document.documentElement.style.setProperty("--gwu-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--gwu-y", `${event.clientY}px`);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <div className="landing-page growup-editorial">
      <div className="gwu-cursor" aria-hidden="true" />

      <header className="gwu-nav-shell">
        <a className="gwu-brand" href="/landingpage" aria-label="Grow UP landing page">
          <span className="gwu-mark"><img src="/icons/growup-logo.png" alt="" /></span>
          <span><b>Grow UP</b><small>Personal wealth tracker</small></span>
        </a>
        <nav aria-label="Landing navigation">
          <a href="#product">Product</a>
          <a href="#how">How it works</a>
          <a href="#privacy">Privacy</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <button onClick={startSignin} className="gwu-signin">Sign in</button>
      </header>

      <main>
        <section className="gwu-hero">
          <Reveal className="gwu-hero-copy">
            <span className="gwu-pill"><i /> Manual wealth tracking. Clearer direction.</span>
            <h1>Money clarity, without handing over your bank login.</h1>
            <p>Grow UP brings your assets, debts, goals, cash flow, and long-term projections into one calm dashboard — so progress becomes visible month after month.</p>
            <div className="gwu-actions">
              <AppButton onClick={startSignup}>Start free <ArrowRight size={18} /></AppButton>
              <AppButton variant="ghost" onClick={tryDemo}>Explore demo</AppButton>
            </div>
            <div className="gwu-trustline">
              <span><Check size={15}/> No bank connection required</span>
              <span><Check size={15}/> Private by default</span>
              <span><Check size={15}/> Cloud backup when wanted</span>
            </div>
          </Reveal>
          <Reveal className="gwu-visual-wrap" delay={120}><HeroVisual /></Reveal>
        </section>

        <Reveal as="section" className="gwu-product-editorial" id="product">
          <div className="gwu-editorial-copy">
            <span className="gwu-kicker">The product</span>
            <h2>Your financial command centre, made legible.</h2>
            <p>Not another budgeting feed. Grow UP is a monthly wealth ritual: update the important numbers, see what changed, and understand what your current path is building.</p>
          </div>
          <div className="gwu-screen-row">
            <Device src={screens.overview[0]} alt={screens.overview[1]} />
            <Device src={screens.goals[0]} alt={screens.goals[1]} />
            <Device src={screens.cashflow[0]} alt={screens.cashflow[1]} />
            <Device src={screens.assets[0]} alt={screens.assets[1]} />
          </div>
        </Reveal>

        <section className="gwu-story" id="how">
          <Reveal className="gwu-story-head">
            <span className="gwu-kicker">How it works</span>
            <h2>Four screens. One monthly habit.</h2>
            <p>Grow UP focuses on direction: what you own, what you owe, what is changing, and what goals are becoming more realistic.</p>
          </Reveal>
          <div className="gwu-story-list">
            {story.map((item, index) => (
              <Reveal as="article" className="gwu-story-item" delay={index * 80} key={item.title}>
                <div className="gwu-story-text">
                  <span>{item.eyebrow}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
                <Device src={item.image[0]} alt={item.image[1]} className="gwu-story-device" />
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal as="section" className="gwu-demo" id="demo">
          <div>
            <span className="gwu-kicker">Interactive demo</span>
            <h2>Click around before you commit.</h2>
            <p>Demo Mode opens with realistic sample data and stays read-only. Explore accounts, goals, cash flow, history, and projections without creating an account.</p>
            <AppButton onClick={tryDemo}>Open demo <ArrowRight size={18} /></AppButton>
          </div>
          <div className="gwu-demo-icons" aria-hidden="true">
            <BarChart3 /><Target /><Wallet />
          </div>
        </Reveal>

        <section className="gwu-privacy" id="privacy">
          <Reveal className="gwu-privacy-intro">
            <span className="gwu-kicker"><Fingerprint size={15}/> Privacy posture</span>
            <h2>Your financial life does not belong to an aggregator.</h2>
            <p>Grow UP is deliberately restrained. You decide what to enter, what to back up, and when to restore saved data.</p>
          </Reveal>
          <div className="gwu-principles">
            {principles.map(([Icon, title, body], index) => (
              <Reveal as="article" className="gwu-principle" delay={index * 70} key={title}>
                <Icon size={22} />
                <h3>{title}</h3>
                <p>{body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="gwu-pricing" id="pricing">
          <Reveal className="gwu-pricing-head">
            <span className="gwu-kicker">Pricing</span>
            <h2>Start free. Upgrade when the picture grows.</h2>
            <p>No pressure wall. The free plan is useful; Pro is for people who want the full long-term system.</p>
          </Reveal>
          <div className="gwu-plan-table">
            <Reveal as="article" className="gwu-plan">
              <div>
                <h3>Free</h3>
                <strong>A$0</strong>
                <small>forever</small>
              </div>
              <ul>
                <li><Check size={16}/> Net worth dashboard</li>
                <li><Check size={16}/> Up to {PRO_LIMITS.accounts} accounts</li>
                <li><Check size={16}/> Up to {PRO_LIMITS.goals} goals</li>
                <li><Check size={16}/> Up to {PRO_LIMITS.transactions} recurring transactions</li>
                <li><Check size={16}/> {PRO_LIMITS.snapshotMonths} months of history</li>
              </ul>
              <AppButton variant="ghost" onClick={startSignup}>Start free</AppButton>
            </Reveal>
            <Reveal as="article" className="gwu-plan gwu-pro" delay={100}>
              <em>Most popular</em>
              <div>
                <h3>Pro</h3>
                <strong>A$3.99</strong>
                <small>/month or A$39.99/year</small>
              </div>
              <ul>
                <li><Check size={16}/> Everything in Free</li>
                <li><Check size={16}/> Unlimited accounts, goals, transactions</li>
                <li><Check size={16}/> Full snapshot history</li>
                <li><Check size={16}/> Smart insights</li>
                <li><Check size={16}/> Wealth Timeline projections</li>
              </ul>
              <AppButton onClick={startSignup}>Start free, upgrade any time</AppButton>
            </Reveal>
          </div>
        </section>

        <Reveal as="section" className="gwu-final">
          <EyeOff size={24} />
          <h2>Your money deserves a longer memory.</h2>
          <p>Make the monthly update. See the direction. Build a financial picture you actually understand.</p>
          <div className="gwu-actions center">
            <AppButton onClick={startSignup}>Create free account</AppButton>
            <AppButton variant="ghost" onClick={tryDemo}>Explore demo <ChevronRight size={18} /></AppButton>
          </div>
        </Reveal>
      </main>

      <footer className="gwu-footer">
        <a className="gwu-brand" href="/landingpage">
          <span className="gwu-mark"><img src="/icons/growup-logo.png" alt="" /></span>
          <span><b>Grow UP</b><small>© {new Date().getFullYear()}</small></span>
        </a>
        <div>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a>
        </div>
      </footer>
    </div>
  );
}
