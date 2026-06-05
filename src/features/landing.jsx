import React from "react";
import { SUPPORT_EMAIL } from "../config";

export function LandingPage() {
  const startApp = () => {
    window.location.href = "/";
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
          <span className="landing-logo app-icon">GV</span>
          <span>
            <b>Grow UP</b>
            <small>Personal Wealth OS</small>
          </span>
        </a>

        <nav>
          <a href="#features">Features</a>
          <a href="#demo">Demo</a>
          <a href="#privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>

        <button onClick={startApp} className="landing-nav-cta">Sign in</button>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <div className="hero-badge">
              <span></span>
              Built for intentional wealth builders
            </div>

            <h1>
              Your Wealth.
              <br />
              Finally Feeling
              <br />
              Intentional.
            </h1>

            <p>
              A calm, intelligent way to track net worth, forecast goals, and turn financial progress into a visible timeline.
            </p>

            <div className="hero-actions">
              <button onClick={startApp} className="primary-landing">Start Building Wealth</button>
              <button onClick={tryDemo} className="secondary-landing">Explore Demo</button>
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
                    <strong>Demo</strong>
                  </div>
                  <span>Demo Mode</span>
                </div>

                <div className="mock-networth">
                  <small>Net Worth</small>
                  <strong>$92,400</strong>
                  <em>↑ +$12,320 over 6 months</em>
                </div>

                <div className="mock-card">
                  <div className="mock-card-row">
                    <div>
                      <small>Goal Forecast</small>
                      <strong>Debt Free</strong>
                    </div>
                    <b>67%</b>
                  </div>
                  <div className="mock-progress"><i></i></div>
                  <div className="mock-forecast">
                    <small>Forecast Finish</small>
                    <strong>March 2027</strong>
                    <span>Based on your current pace.</span>
                  </div>
                </div>

                <div className="mock-chart-card">
                  <div className="mock-card-row">
                    <div>
                      <small>Net Worth Trend</small>
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
              <small>Monthly Growth</small>
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

        <section id="demo" className="demo-conversion">
          <div>
            <span>Interactive Demo</span>
            <h2>Try the full experience instantly.</h2>
            <p>
              Explore Grow UP with realistic sample data. No signup required. Demo Mode is read-only, so you can safely click around.
            </p>
            <button onClick={tryDemo}>Open Interactive Demo</button>
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
            <button onClick={startApp} className="primary-landing">Create Free Account</button>
            <button onClick={tryDemo} className="secondary-landing">Explore Demo</button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand" href="/landingpage">
          <span className="landing-logo app-icon">GV</span>
          <span>
            <b>Grow UP</b>
            <small>© 2026</small>
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




