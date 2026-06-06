import React, { useEffect } from "react";
import { Check, LineChart, Target, Telescope, TrendingUp, Zap } from "lucide-react";
import { PRO_LIMITS, SUPPORT_EMAIL } from "../config";

// Replace with real user quotes when you have them — the band stays hidden
// while this array is empty, so nothing fake ever ships.
const TESTIMONIALS = [
  // { quote: "Finally see all my money in one place without linking my bank.", name: "Sam", detail: "Early user" },
];

const PROOF_STATS = [
  { value: "16", label: "currencies supported" },
  { value: "5 min", label: "average setup time" },
  { value: "A$0", label: "to start — free forever plan" },
];

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

  // Restrained scroll-reveal: fade-up once, ~400ms, disabled for users who
  // prefer reduced motion.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = document.querySelectorAll("[data-reveal]");
    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach(n => n.classList.add("is-revealed"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    nodes.forEach(n => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: TrendingUp,
      title: "Track real wealth",
      body: "See assets, debts, net worth, goals, and cash flow in one calm dashboard."
    },
    {
      icon: Target,
      title: "Forecast your goals",
      body: "Estimate completion dates from your actual month-by-month progress."
    },
    {
      icon: Zap,
      title: "Crush debt faster",
      body: "Track payoff momentum and understand how quickly debt is moving down."
    },
    {
      icon: Telescope,
      title: "Project the future",
      body: "Use compound wealth scenarios to visualise long-term financial outcomes."
    }
  ];

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="/landingpage" aria-label="Grow UP landing page">
          <span className="landing-logo app-icon"><img src="/icons/growup-logo.png" alt="" /></span>
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
              <span></span>
              Built for intentional wealth builders
            </div>

            <h1>
              See your complete
              <br />
              financial picture.
            </h1>

            <p>
              Track net worth, forecast goals, and watch your progress become a timeline — no spreadsheets, no bank logins, no stress.
            </p>

            <div className="hero-actions">
              <button onClick={startSignup} className="primary-landing">Start free</button>
              <button onClick={tryDemo} className="secondary-landing">Explore the demo</button>
            </div>

            <div className="trust-grid">
              {["No bank connection required", "Private by default", "Secure cloud backup", "Built for long-term wealth"].map(item => (
                <div key={item}>
                  <i><Check size={13} strokeWidth={3.5} /></i>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual hero-enter delayed">
            <div className="hero-device-wrap">
              <div className="hero-device">
                <img src="/screenshots/overview.jpeg" alt="Grow UP overview dashboard showing net worth and trends" />
              </div>

              <div className="floating-chip float-soft">
                <small>Goal forecast</small>
                <strong>Debt free · 67%</strong>
              </div>

              <div className="floating-stat float-soft slower">
                <small>Monthly growth</small>
                <strong>+$2,430</strong>
                <span>On track this month</span>
              </div>
            </div>
          </div>
        </section>

        <section className="proof-band" data-reveal>
          {PROOF_STATS.map(stat => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </section>

        {TESTIMONIALS.length > 0 && (
          <section className="landing-section testimonials-section" data-reveal>
            <div className="section-heading">
              <span>From early users</span>
              <h2>People are switching off their spreadsheets.</h2>
            </div>
            <div className="testimonial-grid">
              {TESTIMONIALS.map(t => (
                <figure key={t.name}>
                  <blockquote>“{t.quote}”</blockquote>
                  <figcaption><b>{t.name}</b> · {t.detail}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <section id="features" className="landing-section">
          <div className="section-heading" data-reveal>
            <span>Why Grow UP</span>
            <h2>Build wealth with calm precision.</h2>
            <p>See your assets, debt, cash flow, goals, insights, and future milestones in one premium wealth dashboard.</p>
          </div>

          <div className="feature-grid">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
                  <div className="feature-icon"><Icon size={22} strokeWidth={2.4} /></div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-section screens-section">
          <div className="section-heading" data-reveal>
            <span>See it in action</span>
            <h2>The real app, not a render.</h2>
            <p>Every screen below is Grow UP as your users see it — overview, goals, cash flow, and accounts.</p>
          </div>

          <div className="screens-row" data-reveal>
            {[
              ["/screenshots/overview.jpeg", "Overview dashboard with net worth and trends"],
              ["/screenshots/goals.jpeg", "Wealth goals with progress and forecasts"],
              ["/screenshots/cashflow.jpeg", "Recurring cash flow tracking"],
              ["/screenshots/assets-1.jpeg", "Assets and debts with monthly snapshots"],
            ].map(([src, alt]) => (
              <img key={src} src={src} alt={alt} loading="lazy" />
            ))}
          </div>
        </section>

        <section id="demo" className="demo-conversion" data-reveal>
          <div>
            <span>Interactive demo</span>
            <h2>Try the full experience instantly.</h2>
            <p>
              Explore Grow UP with realistic sample data. No signup required. Demo Mode is read-only, so you can safely click around.
            </p>
            <button onClick={tryDemo}>Open the interactive demo</button>
          </div>
        </section>

        <section className="product-showcase">
          <div className="showcase-copy" data-reveal>
            <span>Built around momentum</span>
            <h2>Not another budget tracker.</h2>
            <p>
              Grow UP is designed around wealth identity: snapshots, goals, insights, timeline projections, and long-term momentum.
            </p>
          </div>

          <div className="showcase-cards">
            {[
              ["01", "Monthly snapshots", "Store historical assets, debts, and net worth so progress becomes visible."],
              ["02", "Goal forecasting", "Estimate when you will hit goals based on your actual historical pace."],
              ["03", "Flexible cash flow", "Track weekly, fortnightly, monthly, quarterly, yearly, and one-off items."],
            ].map(([num, title, body], i) => (
              <article key={num} data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
                <b>{num}</b>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="landing-section pricing-section">
          <div className="section-heading" data-reveal>
            <span>Pricing</span>
            <h2>Free to start. Cheap to go all in.</h2>
            <p>Begin with the free plan and upgrade only when your wealth picture outgrows it.</p>
          </div>

          <div className="pricing-grid">
            <article data-reveal>
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
            </article>

            <article className="featured" data-reveal style={{ transitionDelay: "80ms" }}>
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
            </article>
          </div>
        </section>

        <section id="privacy" className="privacy-band" data-reveal>
          <div>
            <h2>Private by design. Premium by feel.</h2>
            <p>
              Grow UP does not require bank connections. You control what you enter, what you back up, and when you restore saved data.
            </p>
          </div>

          <ul>
            <li>No forced bank integrations</li>
            <li>Google Sign-In supported</li>
            <li>Cloud backup available</li>
            <li>Demo Mode is read-only</li>
          </ul>
        </section>

        <section className="final-cta" data-reveal>
          <h2>See the future you are building.</h2>
          <p>Grow UP turns financial progress into a timeline you can see, track, and feel.</p>
          <div>
            <button onClick={startSignup} className="primary-landing">Create free account</button>
            <button onClick={tryDemo} className="secondary-landing">Explore the demo</button>
          </div>
        </section>
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
