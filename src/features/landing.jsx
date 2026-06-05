import React from "react";
import { PRO_LIMITS, SUPPORT_EMAIL } from "../config";

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

  const features = [
    {
      icon: "📈",
      title: "Track real wealth",
      body: "See assets, debts, net worth, goals, and cash flow in one calm dashboard."
    },
    {
      icon: "🎯",
      title: "Forecast your goals",
      body: "Estimate completion dates from your actual month-by-month progress."
    },
    {
      icon: "⚡",
      title: "Crush debt faster",
      body: "Track payoff momentum and understand how quickly debt is moving down."
    },
    {
      icon: "🔮",
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
          <div className="hero-copy">
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
                  <i>✓</i>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            <div className="phone-mockup">
              <div className="mock-phone-inner">
                <div className="mock-header">
                  <div>
                    <small>Welcome back</small>
                    <strong>Alex</strong>
                  </div>
                  <span>On track</span>
                </div>

                <div className="mock-networth">
                  <small>Net worth</small>
                  <strong>$92,400</strong>
                  <em>↑ +$12,320 over 6 months</em>
                </div>

                <div className="mock-card">
                  <div className="mock-card-row">
                    <div>
                      <small>Goal forecast</small>
                      <strong>Debt free</strong>
                    </div>
                    <b>67%</b>
                  </div>
                  <div className="mock-progress"><i></i></div>
                  <div className="mock-forecast">
                    <small>Forecast finish</small>
                    <strong>March 2027</strong>
                    <span>Based on your current pace.</span>
                  </div>
                </div>

                <div className="mock-chart-card">
                  <div className="mock-card-row">
                    <div>
                      <small>Net worth trend</small>
                      <strong>Momentum</strong>
                    </div>
                    <b>+18%</b>
                  </div>
                  <svg viewBox="0 0 300 140">
                    <path d="M0 120 C 30 118, 50 112, 75 105 C 100 96, 120 92, 150 84 C 180 76, 210 66, 235 52 C 255 42, 275 30, 300 18" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="floating-stat">
              <small>Monthly growth</small>
              <strong>+$2,430</strong>
              <span>On track this month</span>
            </div>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="section-heading">
            <span>Why Grow UP</span>
            <h2>Build wealth with calm precision.</h2>
            <p>See your assets, debt, cash flow, goals, insights, and future milestones in one premium wealth dashboard.</p>
          </div>

          <div className="feature-grid">
            {features.map(feature => (
              <article key={feature.title}>
                <div>{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section screens-section">
          <div className="section-heading">
            <span>See it in action</span>
            <h2>The real app, not a render.</h2>
            <p>Every screen below is Grow UP as your users see it — overview, goals, cash flow, and accounts.</p>
          </div>

          <div className="screens-row">
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

        <section id="demo" className="demo-conversion">
          <div>
            <span>Interactive Demo</span>
            <h2>Try the full experience instantly.</h2>
            <p>
              Explore Grow UP with realistic sample data. No signup required. Demo Mode is read-only, so you can safely click around.
            </p>
            <button onClick={tryDemo}>Open the interactive demo</button>
          </div>
        </section>

        <section className="product-showcase">
          <div className="showcase-copy">
            <span>Built around momentum</span>
            <h2>Not another budget tracker.</h2>
            <p>
              Grow UP is designed around wealth identity: snapshots, goals, insights, timeline projections, and long-term momentum.
            </p>
          </div>

          <div className="showcase-cards">
            <article>
              <b>01</b>
              <h3>Monthly snapshots</h3>
              <p>Store historical assets, debts, and net worth so progress becomes visible.</p>
            </article>
            <article>
              <b>02</b>
              <h3>Goal forecasting</h3>
              <p>Estimate when you will hit goals based on your actual historical pace.</p>
            </article>
            <article>
              <b>03</b>
              <h3>Flexible cash flow</h3>
              <p>Track weekly, fortnightly, monthly, quarterly, yearly, and one-off items.</p>
            </article>
          </div>
        </section>

        <section id="pricing" className="landing-section pricing-section">
          <div className="section-heading">
            <span>Pricing</span>
            <h2>Free to start. Cheap to go all in.</h2>
            <p>Begin with the free plan and upgrade only when your wealth picture outgrows it.</p>
          </div>

          <div className="pricing-grid">
            <article>
              <h3>Free</h3>
              <div className="price"><strong>A$0</strong><span>forever</span></div>
              <ul>
                <li>✓ Net worth dashboard</li>
                <li>✓ Up to {PRO_LIMITS.accounts} accounts</li>
                <li>✓ Up to {PRO_LIMITS.goals} goals</li>
                <li>✓ Up to {PRO_LIMITS.transactions} recurring transactions</li>
                <li>✓ {PRO_LIMITS.snapshotMonths} months of snapshot history</li>
                <li>✓ Compound calculator &amp; cloud backup</li>
              </ul>
              <button onClick={startSignup} className="secondary-landing">Start free</button>
            </article>

            <article className="featured">
              <em>Most popular</em>
              <h3>Pro</h3>
              <div className="price"><strong>A$3.99</strong><span>/month, or A$39.99/year</span></div>
              <ul>
                <li>✓ Everything in Free</li>
                <li>✓ Unlimited accounts, goals &amp; transactions</li>
                <li>✓ Full snapshot history</li>
                <li>✓ Insights — smart reads on your money</li>
                <li>✓ Wealth Timeline projections</li>
              </ul>
              <button onClick={startSignup} className="primary-landing">Start free, upgrade any time</button>
            </article>
          </div>
        </section>

        <section id="privacy" className="privacy-band">
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

        <section className="final-cta">
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




