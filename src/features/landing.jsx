import React, { useEffect } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  Cloud,
  Database,
  Eye,
  Fingerprint,
  LineChart,
  Lock,
  Shield,
  Target,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { PRO_LIMITS, SUPPORT_EMAIL } from "../config";

const SCREENS = [
  ["/screenshots/overview.jpeg", "Overview dashboard showing net worth and progress"],
  ["/screenshots/goals.jpeg", "Goals screen with progress cards and forecasts"],
  ["/screenshots/cashflow.jpeg", "Cash flow screen showing recurring transactions"],
  ["/screenshots/assets-1.jpeg", "Assets and debts screen with account balances"],
];

const FEATURES = [
  [TrendingUp, "Net worth that stays visible", "Track assets, debts, and month-to-month movement without building another spreadsheet."],
  [Target, "Goals with real timelines", "Estimate when goals may be reached from your actual pace, not optimistic guesses."],
  [Wallet, "Cash flow without bank scraping", "Model income, expenses, recurring money movement, and surplus on your terms."],
  [LineChart, "A longer financial memory", "Snapshots and projections help you see whether today's habits are creating momentum."],
];

const PRINCIPLES = [
  [Shield, "No forced bank linking", "Grow UP does not need your bank credentials to be useful."],
  [Database, "Manual by design", "Intentional inputs create a calmer relationship with money."],
  [Cloud, "Backup when wanted", "Create an account only when you want cloud backup and restore."],
  [Lock, "Private by default", "No transaction scraping, no surveillance finance, no unnecessary data grab."],
];

function Reveal({ children, className = "", delay = 0, as: Tag = "div", id }) {
  return <Tag id={id} className={className} data-reveal style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>;
}

function PhoneStack() {
  return (
    <div className="gu-phone-stage" aria-label="Grow UP product preview">
      <div className="gu-phone gu-phone-back"><img src="/screenshots/goals.jpeg" alt="" /></div>
      <div className="gu-phone gu-phone-main"><img src="/screenshots/overview.jpeg" alt="Grow UP overview dashboard" /></div>
      <div className="gu-float gu-float-one"><small>Net worth</small><strong>$93,400</strong><span>+$1,823 this month</span></div>
      <div className="gu-float gu-float-two"><small>Goal forecast</small><strong>Debt free · 67%</strong></div>
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
    }, { threshold: 0.12, rootMargin: "0px 0px -70px 0px" });
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
    <div className="landing-page growup-worldclass gu-v2">
      <div className="gu-cursor" aria-hidden="true" />
      <header className="gu-nav">
        <a className="gu-brand" href="/landingpage" aria-label="Grow UP landing page">
          <span className="gu-logo"><img src="/icons/growup-logo.png" alt="" /></span>
          <span><b>Grow UP</b><small>personal wealth tracker</small></span>
        </a>
        <nav>
          <a href="#product">Product</a><a href="#features">Features</a><a href="#privacy">Privacy</a><a href="#pricing">Pricing</a>
        </nav>
        <button onClick={startSignin} className="gu-signin">Sign in</button>
      </header>

      <main>
        <section className="gu-hero">
          <div className="gu-hero-copy">
            <Reveal className="gu-pill"><span /> Personal wealth tracking. Clearer direction.</Reveal>
            <h1>Money clarity, without handing over your bank login.</h1>
            <p>Grow UP brings your assets, debts, goals, cash flow, and long-term projections into one calm dashboard — so progress becomes visible month after month.</p>
            <div className="gu-actions">
              <button onClick={startSignup} className="gu-btn gu-primary">Start free <ArrowRight size={18} /></button>
              <button onClick={tryDemo} className="gu-btn gu-secondary">Explore demo</button>
            </div>
            <div className="gu-trust">
              {['No bank connection required','Private by default','Cloud backup when wanted','Free to start'].map((item) => <span key={item}><Check size={14}/>{item}</span>)}
            </div>
          </div>
          <Reveal className="gu-hero-visual" delay={100}><PhoneStack /></Reveal>
        </section>

        <Reveal as="section" className="gu-product-band" id="product">
          <div className="gu-band-head">
            <span className="gu-kicker">The product</span>
            <h2>Your financial command centre, made legible.</h2>
            <p>Not another budgeting feed. Grow UP is a monthly wealth ritual: update the important numbers, see what changed, and understand what your current path is building.</p>
          </div>
          <div className="gu-screen-wall">
            {SCREENS.map(([src, alt], i) => <figure key={src} className={`gu-screen gu-screen-${i+1}`}><img src={src} alt={alt} /></figure>)}
          </div>
        </Reveal>

        <section className="gu-section gu-light" id="features">
          <Reveal className="gu-section-head">
            <span className="gu-kicker">What it brings together</span>
            <h2>Progress you can actually inspect.</h2>
            <p>The app focuses on direction: what you own, what you owe, what is changing, and what goals are becoming more realistic.</p>
          </Reveal>
          <div className="gu-feature-grid">
            {FEATURES.map(([Icon, title, body], i) => <Reveal as="article" className="gu-feature" delay={i*70} key={title}><div><Icon size={22}/></div><h3>{title}</h3><p>{body}</p></Reveal>)}
          </div>
        </section>

        <Reveal as="section" className="gu-demo-panel" id="demo">
          <div>
            <span className="gu-kicker">Interactive demo</span>
            <h2>Click around before you commit.</h2>
            <p>Demo Mode opens with realistic sample data and stays read-only. Explore accounts, goals, cash flow, history, and projections without creating an account.</p>
            <button onClick={tryDemo} className="gu-btn gu-primary">Open demo <ArrowRight size={18}/></button>
          </div>
          <div className="gu-demo-orbit" aria-hidden="true"><BarChart3/><Target/><Wallet/></div>
        </Reveal>

        <section className="gu-section gu-dark" id="privacy">
          <Reveal className="gu-section-head">
            <span className="gu-kicker"><Fingerprint size={16}/> Privacy posture</span>
            <h2>Designed for financial data people actually care about.</h2>
            <p>Grow UP is deliberately restrained. You decide what to enter, what to back up, and when to restore saved data.</p>
          </Reveal>
          <div className="gu-principle-grid">
            {PRINCIPLES.map(([Icon, title, body], i) => <Reveal as="article" className="gu-principle" delay={i*70} key={title}><Icon size={24}/><h3>{title}</h3><p>{body}</p></Reveal>)}
          </div>
        </section>

        <section className="gu-section gu-light" id="pricing">
          <Reveal className="gu-section-head centered">
            <span className="gu-kicker">Pricing</span>
            <h2>Start free. Upgrade when the picture grows.</h2>
            <p>No pressure wall. The free plan is useful; Pro is for people who want the full long-term system.</p>
          </Reveal>
          <div className="gu-pricing-grid">
            <Reveal as="article" className="gu-price-card">
              <h3>Free</h3><strong>A$0</strong><small>forever</small>
              <ul>
                <li><Check/> Net worth dashboard</li>
                <li><Check/> Up to {PRO_LIMITS.accounts} accounts</li>
                <li><Check/> Up to {PRO_LIMITS.goals} goals</li>
                <li><Check/> Up to {PRO_LIMITS.transactions} recurring transactions</li>
                <li><Check/> {PRO_LIMITS.snapshotMonths} months of history</li>
              </ul>
              <button onClick={startSignup} className="gu-btn gu-secondary">Start free</button>
            </Reveal>
            <Reveal as="article" className="gu-price-card pro" delay={90}>
              <em>Most popular</em><h3>Pro</h3><strong>A$3.99</strong><small>/month or A$39.99/year</small>
              <ul>
                <li><Check/> Everything in Free</li>
                <li><Check/> Unlimited accounts, goals, transactions</li>
                <li><Check/> Full snapshot history</li>
                <li><Check/> Smart insights</li>
                <li><Check/> Wealth Timeline projections</li>
              </ul>
              <button onClick={startSignup} className="gu-btn gu-primary">Start free, upgrade any time</button>
            </Reveal>
          </div>
        </section>

        <Reveal as="section" className="gu-final">
          <Zap size={24}/>
          <h2>Your money deserves a longer memory.</h2>
          <p>Make the monthly update. See the direction. Build a financial picture you actually understand.</p>
          <div><button onClick={startSignup} className="gu-btn gu-primary">Create free account</button><button onClick={tryDemo} className="gu-btn gu-secondary">Explore demo</button></div>
        </Reveal>
      </main>

      <footer className="gu-footer">
        <a className="gu-brand" href="/landingpage"><span className="gu-logo"><img src="/icons/growup-logo.png" alt="" /></span><span><b>Grow UP</b><small>by Ogbara · © {new Date().getFullYear()}</small></span></a>
        <div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a></div>
      </footer>
    </div>
  );
}
