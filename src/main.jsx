
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home, CreditCard, Repeat2, Target, Menu, Plus, Pencil, Trash2, Archive,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Sun, Moon, TrendingUp,
  X, Save, Check, DownloadCloud, RotateCcw, SlidersHorizontal, ArrowLeft
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { supabase } from "./supabaseClient";
import "./styles.css";

const STORAGE_KEY = "growup_history_monthbar_v1";

const money = (n) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0
}).format(Number(n || 0));

const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const monthLabel = (key) => {
  const [y,m] = key.split("-").map(Number);
  return new Date(y, m-1, 1).toLocaleDateString("en-US", { month:"long", year:"numeric" });
};
const shortMonthLabel = (key) => {
  const [y,m] = key.split("-").map(Number);
  return new Date(y, m-1, 1).toLocaleDateString("en-US", { month:"short", year:"2-digit" }).replace(" ", " '");
};
const addMonths = (key, delta) => {
  const [y,m] = key.split("-").map(Number);
  const d = new Date(y, m-1+delta, 1);
  return monthKey(d);
};

const currentMonthKey = () => monthKey(new Date());
const isFutureMonth = (key) => key.localeCompare(currentMonthKey()) > 0;
const canMoveToMonth = (key) => !isFutureMonth(key);

const EMPTY_STATE = {
  firstName: "",
  theme: "light",
  dashboardStyle: "minimal",
  notificationsEnabled: false,
  emailRemindersEnabled: false,
  emailReminderDays: 1,
  monthlyBalanceReminderDay: 28,
  emailGoalReminders: true,
  emailMilestoneEmails: true,
  onboardingDismissed: false,
  mode: "Real Mode",
  selectedMonth: monthKey(),
  accounts: [],
  transactions: [],
  goals: [],
  monthSnapshots: {}
};

function safeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function useGrowState() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...EMPTY_STATE, ...JSON.parse(raw) } : EMPTY_STATE;
    } catch {
      return EMPTY_STATE;
    }
  });
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);
  return [state, setState];
}




const DEMO_STATE = {
  firstName: "Demo",
  theme: "light",
  dashboardStyle: "minimal",
  selectedMonth: currentMonthKey(),
  accounts: [
    { id:"demo-super", name:"Retirement Fund", icon:"🏦", kind:"asset", balance:75000, previous:72726 },
    { id:"demo-fire", name:"Investment Portfolio", icon:"🔥", kind:"asset", balance:34400, previous:28000 },
    { id:"demo-car", name:"Vehicle Savings", icon:"🚙", kind:"asset", balance:28000, previous:28000 },
    { id:"demo-business", name:"Emergency Fund", icon:"👔", kind:"asset", balance:1500, previous:0 },
    { id:"demo-loan", name:"Personal Loan", icon:"💳", kind:"debt", balance:41274, previous:41474 },
    { id:"demo-tax", name:"Credit Card Balance", icon:"🏦", kind:"debt", balance:6049, previous:6049 }
  ],
  transactions: [
    { id:"demo-salary", type:"income", name:"Salary", icon:"💵", amount:6392, category:"Income", date:new Date(new Date().getFullYear(), new Date().getMonth(), 27).toISOString(), frequency:"monthly", recurring:true },
    { id:"demo-rent", type:"expense", name:"Rent", icon:"🏡", amount:2303, category:"Home", date:new Date(new Date().getFullYear(), new Date().getMonth(), 19).toISOString(), frequency:"monthly", recurring:true },
    { id:"demo-insurance", type:"expense", name:"Car Insurance", icon:"🚗", amount:178, category:"Insurance", date:new Date(new Date().getFullYear(), new Date().getMonth(), 14).toISOString(), frequency:"monthly", recurring:true },
    { id:"demo-gym", type:"expense", name:"Gym", icon:"🏋️", amount:23, category:"Health", date:new Date(new Date().getFullYear(), new Date().getMonth(), 22).toISOString(), frequency:"weekly", recurring:true }
  ],
  goals: [
    {
      id:"demo-goal-first100",
      name:"First $100K",
      icon:"💎",
      goalType:"netWorth",
      account:"Net Worth",
      color:"purple",
      target:100000,
      current:84200,
      deadline:"2027-02-01",
      open:false
    },

    {
      id:"demo-goal-portfolio",
      name:"250K Portfolio",
      icon:"📈",
      goalType:"accountGrowth",
      accountId:"demo-investments",
      account:"Investment Portfolio",
      color:"green",
      target:250000,
      current:146000,
      deadline:"2029-08-01",
      open:false
    },

    {
      id:"demo-goal-freedom",
      name:"Work Optional",
      icon:"🔥",
      goalType:"fire",
      account:"Financial Independence",
      color:"gold",
      target:750000,
      current:182000,
      deadline:"2036-01-01",
      open:false
    },

    {
      id:"demo-goal-debtfree",
      name:"Debt Free Life",
      icon:"⚡",
      goalType:"debtPayoff",
      accountId:"demo-loan",
      account:"Personal Loan",
      color:"red",
      start:48000,
      target:0,
      current:19200,
      deadline:"2028-03-01",
      open:false
    },

    {
      id:"demo-goal-property",
      name:"First Investment Property",
      icon:"🏡",
      goalType:"savings",
      account:"Property Deposit",
      color:"blue",
      target:120000,
      current:42000,
      deadline:"2029-11-01",
      open:false
    }
  ],
  monthSnapshots: {}
};

function buildDemoState() {
  const now = new Date();
  const selectedMonth = monthKey(now);
  const snapshots = {};
  const baseAssets = [124426, 127626, 130176, 128726, 138900, 140200];
  const baseDebts = [48123, 47923, 47723, 47523, 47323, 46800];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const idx = 5 - i;
    const assetsTotal = baseAssets[idx] || 138900;
    const debtsTotal = baseDebts[idx] || 47323;

    const accounts = [
      { id:"demo-super", name:"Retirement Fund", icon:"🏦", kind:"asset", balance:Math.round(assetsTotal * .54), previous:0 },
      { id:"demo-fire", name:"Investment Portfolio", icon:"🔥", kind:"asset", balance:Math.round(assetsTotal * .25), previous:0 },
      { id:"demo-car", name:"Vehicle Savings", icon:"🚙", kind:"asset", balance:28000, previous:0 },
      { id:"demo-business", name:"Emergency Fund", icon:"👔", kind:"asset", balance:Math.max(0, assetsTotal - Math.round(assetsTotal * .54) - Math.round(assetsTotal * .25) - 28000), previous:0 },
      { id:"demo-loan", name:"Personal Loan", icon:"💳", kind:"debt", balance:Math.round(debtsTotal * .87), previous:0 },
      { id:"demo-tax", name:"Credit Card Balance", icon:"🏦", kind:"debt", balance:debtsTotal - Math.round(debtsTotal * .87), previous:0 }
    ];

    snapshots[key] = {
      assets: accounts.filter(a => a.kind === "asset").reduce((s,a)=>s+Number(a.balance||0),0),
      debts: accounts.filter(a => a.kind === "debt").reduce((s,a)=>s+Number(a.balance||0),0),
      net: accounts.filter(a => a.kind === "asset").reduce((s,a)=>s+Number(a.balance||0),0) - accounts.filter(a => a.kind === "debt").reduce((s,a)=>s+Number(a.balance||0),0),
      accounts,
      createdAt: d.toISOString(),
      updatedAt: d.toISOString()
    };
  }

  const latest = snapshots[selectedMonth] || Object.values(snapshots).at(-1);
  return {
    ...DEMO_STATE,
    selectedMonth,
    accounts: latest?.accounts || DEMO_STATE.accounts,
    monthSnapshots: snapshots
  };
}

function readOnlyDemoAlert() {
  alert("Demo Mode is read-only. Exit Demo Mode to edit, save, or restore your real data.");
}

function getUserDisplayName(session, state) {
  const metadata = session?.user?.user_metadata || {};

  const metadataName =
    metadata.first_name ||
    metadata.full_name ||
    metadata.name ||
    metadata.display_name ||
    "";

  if (metadataName) {
    return String(metadataName).split(" ")[0];
  }

  if (state?.firstName) {
    return state.firstName;
  }

  const emailPrefix = session?.user?.email?.split("@")?.[0];
  if (emailPrefix) {
    return emailPrefix;
  }

  return "there";
}


function LegalPage({ type }) {
  const isPrivacy = type === "privacy";

  return (
    <div className="app-shell">
      <main className="phone legal-phone">
        <section className="legal-header">
          <div className="app-icon legal-logo">GV</div>
          <div>
            <h1>{isPrivacy ? "Privacy Policy" : "Terms of Service"}</h1>
            <p>Effective Date: May 16, 2026</p>
          </div>
        </section>

        {isPrivacy ? <PrivacyPolicyContent /> : <TermsContent />}

        <div className="legal-footer">
          <a href="/">Back to Grow UP</a>
        </div>
      </main>
    </div>
  );
}

function PrivacyPolicyContent() {
  return (
    <article className="legal-card">
      <p>Welcome to Grow UP (“Grow UP”, “we”, “our”, or “us”). This Privacy Policy explains how Grow UP collects, uses, stores, and protects information when you use the Grow UP application and related services available at https://growupapp.app.</p>

      <h2>1. Information We Collect</h2>
      <p>Grow UP may collect account information such as your name, email address, and authentication provider information. Grow UP also stores financial information you manually enter, including assets, debts, goals, income, expenses, monthly snapshots, and financial progress data.</p>
      <p>We may also collect limited technical information such as device type, browser type, IP address, app usage diagnostics, and error logs.</p>

      <h2>2. How We Use Information</h2>
      <p>We use information to provide app functionality, save and restore snapshots, synchronize data across devices, authenticate users, improve reliability, provide support, and protect against abuse or unauthorized access.</p>
      <p>Grow UP does not sell personal financial data.</p>

      <h2>3. Local Storage and Cloud Sync</h2>
      <p>Grow UP stores some data locally on your device for performance and offline functionality. If cloud sync is enabled, your app data may also be stored using third-party infrastructure providers including Supabase.</p>

      <h2>4. Google Sign-In</h2>
      <p>If you sign in with Google, Grow UP receives basic account information associated with your Google account, such as your name, email address, and profile information. Grow UP does not access Gmail, Google Drive, Google Photos, Contacts, or Calendar data unless explicitly authorized in the future.</p>

      <h2>5. Data Access</h2>
      <p>Grow UP operators may technically access stored data when reasonably necessary for maintenance, troubleshooting, abuse prevention, security, support requests, or system reliability. Access is limited to operational purposes only.</p>

      <h2>6. Data Retention and Deletion</h2>
      <p>We retain user data while accounts remain active or as reasonably necessary to provide the service. Users may request deletion of their account and associated data by contacting ogbaragil@gmail.com.</p>

      <h2>7. Security</h2>
      <p>Grow UP uses commercially reasonable safeguards to protect stored information. However, no method of electronic storage is completely secure, and no online platform can guarantee absolute security.</p>

      <h2>8. Third-Party Services</h2>
      <p>Grow UP may rely on third-party providers including Supabase, Cloudflare, and Google Authentication services. These providers may process limited information necessary to operate the platform.</p>

      <h2>9. Financial Disclaimer</h2>
      <p>Grow UP is a personal finance tracking and goal management tool only. Grow UP is not a bank, financial advisor, or investment advisor and does not guarantee financial outcomes.</p>

      <h2>10. Children’s Privacy</h2>
      <p>Grow UP is not intended for children under 13 years of age. We do not knowingly collect personal information from children.</p>

      <h2>11. Changes to This Policy</h2>
      <p>We may update this Privacy Policy periodically. Updated versions will be posted at https://growupapp.app/privacy.</p>

      <h2>12. Contact</h2>
      <p>For questions, support requests, or data deletion requests, contact Gilbert Ogbara at ogbaragil@gmail.com.</p>
    </article>
  );
}

function TermsContent() {
  return (
    <article className="legal-card">
      <p>These Terms of Service (“Terms”) govern your access to and use of Grow UP, available at https://growupapp.app. By using Grow UP, you agree to these Terms.</p>

      <h2>1. About Grow UP</h2>
      <p>Grow UP is a personal finance tracking, goal management, and wealth snapshot application. It helps users manually track assets, debts, goals, income, expenses, and progress over time.</p>

      <h2>2. Not Financial Advice</h2>
      <p>Grow UP is provided for informational and organisational purposes only. Grow UP is not a bank, financial advisor, investment advisor, tax advisor, or legal advisor. You are solely responsible for financial, investment, tax, and legal decisions.</p>

      <h2>3. User Accounts</h2>
      <p>You may need an account to use certain features. You are responsible for maintaining the confidentiality of your login credentials and for activity under your account.</p>

      <h2>4. User Data</h2>
      <p>You are responsible for the accuracy of the information you enter into Grow UP. Grow UP does not independently verify user-entered financial data.</p>

      <h2>5. Cloud Sync and Availability</h2>
      <p>Grow UP may provide cloud sync and backup features using third-party infrastructure. We do not guarantee uninterrupted access, error-free operation, or permanent preservation of data. You should keep independent records of important financial information.</p>

      <h2>6. Acceptable Use</h2>
      <p>You agree not to misuse Grow UP, attempt unauthorized access, interfere with the service, upload malicious code, or use the service for unlawful purposes.</p>

      <h2>7. Intellectual Property</h2>
      <p>Grow UP and its design, branding, software, and content are owned by or licensed to the operator. You may not copy, modify, reverse engineer, or distribute the app except as permitted by law.</p>

      <h2>8. Third-Party Services</h2>
      <p>Grow UP may integrate with or rely on third-party services such as Supabase, Cloudflare, and Google Authentication. Their terms and policies may also apply.</p>

      <h2>9. Termination</h2>
      <p>We may suspend or terminate access if you violate these Terms or misuse the service. You may stop using Grow UP at any time and may request data deletion by contacting ogbaragil@gmail.com.</p>

      <h2>10. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, Grow UP is provided “as is” and “as available”. We are not liable for financial losses, lost data, lost profits, indirect damages, or decisions made based on information in the app.</p>

      <h2>11. Changes to These Terms</h2>
      <p>We may update these Terms periodically. Updated versions will be posted at https://growupapp.app/terms. Continued use of Grow UP after updates means you accept the revised Terms.</p>

      <h2>12. Governing Law</h2>
      <p>These Terms are governed by the laws of Victoria, Australia, unless otherwise required by applicable law.</p>

      <h2>13. Contact</h2>
      <p>For questions about these Terms, contact Gilbert Ogbara at ogbaragil@gmail.com.</p>
    </article>
  );
}



function LandingPage() {
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
          <a href="mailto:ogbaragil@gmail.com">Contact</a>
        </div>
      </footer>
    </div>
  );
}




function buildGrowUpInsights(state, totals) {
  const latest = latestDashboardState(state);
  const latestTotals = computeTotals(latest);
  const accounts = getAccountsForSelectedMonth(latest);
  const assetAccounts = accounts.filter(a => a.kind === "asset" && Number(a.balance || 0) > 0);
  const debtAccounts = accounts.filter(a => a.kind === "debt" && Number(a.balance || 0) > 0);
  const topAsset = assetAccounts.slice().sort((a,b)=>Number(b.balance||0)-Number(a.balance||0))[0];

  const insights = [];

  const netChange = latestTotals.net - latestTotals.prevNet;
  if (latestTotals.prevNet) {
    insights.push({
      icon: netChange >= 0 ? "↗" : "↘",
      label: "Net Worth",
      title: `${netChange >= 0 ? "Up" : "Down"} ${money(Math.abs(netChange))}`,
      body: `${netChange >= 0 ? "Growth" : "Drop"} versus the previous month.`,
      tone: netChange >= 0 ? "gain" : "risk"
    });
  }

  if (topAsset && latestTotals.assets) {
    const pct = Math.round((Number(topAsset.balance || 0) / Math.max(1, latestTotals.assets)) * 100);
    insights.push({
      icon: "◔",
      label: "Concentration",
      title: `${topAsset.name} is ${pct}%`,
      body: "Your largest asset currently drives the biggest share of your wealth.",
      tone: "gold"
    });
  }

  if (debtAccounts.length) {
    const totalDebt = debtAccounts.reduce((s,a)=>s+Number(a.balance||0),0);
    const debtRatio = latestTotals.assets ? Math.round((totalDebt / Math.max(1, latestTotals.assets)) * 100) : 0;
    insights.push({
      icon: "!",
      label: "Debt Pressure",
      title: `${debtRatio}% debt ratio`,
      body: debtRatio <= 35 ? "Debt looks controlled relative to assets." : "Debt is taking a meaningful share of your balance sheet.",
      tone: debtRatio <= 35 ? "gain" : "risk"
    });
  }

  const activeGoals = (latest.goals || []).filter(g => !g.archived);
  if (activeGoals.length) {
    const accountsForMonth = getAccountsForSelectedMonth(latest);
    const goalScores = activeGoals.map(g => {
      let calc = calculateGoalProgress(g, latestTotals, accountsForMonth);
      calc = refineDebtPayoffCalcWithHistory(g, latest, calc);
      const forecast = estimateGoalCompletion(g, latest, calc);
      return { goal:g, calc, forecast };
    }).sort((a,b)=>Number(b.calc.progress||0)-Number(a.calc.progress||0));

    const best = goalScores[0];
    if (best) {
      insights.push({
        icon: "◎",
        label: "Goal Pace",
        title: `${best.goal.name} leads`,
        body: `${Math.round(best.calc.progress || 0)}% complete${best.forecast?.label ? ` · ${best.forecast.label}` : ""}.`,
        tone: "forecast"
      });
    }
  }

  const cashIn = latestTotals.income;
  const cashOut = latestTotals.expenses;
  if (cashIn || cashOut) {
    const surplus = cashIn - cashOut;
    insights.push({
      icon: surplus >= 0 ? "+" : "−",
      label: "Cash Flow",
      title: `${surplus >= 0 ? "Surplus" : "Shortfall"} ${money(Math.abs(surplus))}`,
      body: "Based on recurring and upcoming transactions currently entered.",
      tone: surplus >= 0 ? "gain" : "risk"
    });
  }

  return insights.slice(0, 5);
}


function buildWealthTimelineItems(state, scenario = "balanced") {
  const latest = latestDashboardState(state);
  const totals = computeTotals(latest);
  const accounts = getAccountsForSelectedMonth(latest);
  const activeGoals = (latest.goals || []).filter(g => !g.archived);
  const now = new Date();
  const netWorth = Number(totals.net || 0);
  const prevNetWorth = Number(totals.prevNet || 0);

  const scenarioConfig = {
    conservative: { label:"Conservative", multiplier:.65, annualReturn:.035 },
    balanced: { label:"Balanced", multiplier:1, annualReturn:.055 },
    aggressive: { label:"Aggressive", multiplier:1.35, annualReturn:.075 }
  }[scenario] || { label:"Balanced", multiplier:1, annualReturn:.055 };

  const history = historyRows(latest).slice().sort((a,b)=>a.key.localeCompare(b.key)).filter(r=>Number.isFinite(Number(r.net)));
  const growths = history.slice(-6).map((r,i,arr)=> i ? Number(r.net||0) - Number(arr[i-1].net||0) : null).filter(v=>Number.isFinite(v));
  const avgGrowth = growths.length ? growths.reduce((s,v)=>s+v,0)/growths.length : Math.max(0, netWorth - prevNetWorth);

  const income = totals.income;
  const out = totals.expenses;
  const cashSurplus = income - out;
  const monthlyAdd = Math.max(1, avgGrowth, cashSurplus * .55) * scenarioConfig.multiplier;
  const monthlyReturn = Math.pow(1 + scenarioConfig.annualReturn, 1/12) - 1;

  const monthsTo = (target) => {
    if (netWorth >= target) return 0;
    let projected = netWorth;
    for (let m=1; m<=720; m++) {
      projected = (projected * (1 + monthlyReturn)) + monthlyAdd;
      if (projected >= target) return m;
    }
    return null;
  };
  const futureDate = (months) => months === null || months === undefined ? null : new Date(now.getFullYear(), now.getMonth() + months, 1);
  const dateLabel = (date) => date ? date.toLocaleDateString("en-US", { month:"long", year:"numeric" }) : "Needs more trend data";

  const rows = [{
    icon:"●",
    title:money(netWorth),
    label:"Current net worth",
    detail:monthLabel(latest.selectedMonth),
    tone:"now",
    category:"Today",
    sort:now.getTime()
  }];

  activeGoals.forEach(goal => {
    let calc = calculateGoalProgress(goal, totals, accounts);
    calc = refineDebtPayoffCalcWithHistory(goal, latest, calc);
    const forecast = estimateGoalCompletion(goal, latest, calc);
    let d = forecast?.etaDate ? new Date(forecast.etaDate) : goal.deadline ? new Date(goal.deadline) : null;
    rows.push({
      icon: goal.icon || goalIconForType(goal.goalType),
      title: goal.name,
      label: forecast?.label || dateLabel(d),
      detail: `${Math.round(calc.progress || 0)}% complete`,
      tone: calc.progress >= 80 ? "gain" : goal.goalType === "debtPayoff" ? "risk" : "forecast",
      category:"Goal",
      sort: d ? d.getTime() : Number.MAX_SAFE_INTEGER - 10
    });
  });

  [
    { amount:100000, title:"First 100k", icon:"💎" },
    { amount:250000, title:"Quarter Million", icon:"🏛️" },
    { amount:500000, title:"Half Million", icon:"🚀" },
    { amount:1000000, title:"Millionaire", icon:"👑" }
  ].filter(m=>netWorth < m.amount).slice(0,3).forEach(m => {
    const d = futureDate(monthsTo(m.amount));
    rows.push({
      icon:m.icon,
      title:m.title,
      label:dateLabel(d),
      detail:`${money(m.amount)} target · ${scenarioConfig.label} case`,
      tone:"gold",
      category:"Wealth Milestone",
      sort:d ? d.getTime() : Number.MAX_SAFE_INTEGER - 8
    });
  });

  const debts = accounts.filter(a=>a.kind==="debt" && Number(a.balance||0)>0);
  const totalDebt = debts.reduce((s,a)=>s+Number(a.balance||0),0);
  if (totalDebt > 0) {
    const currentReduction = debts.reduce((s,a)=>s+Math.max(0, Number(a.previous||0)-Number(a.balance||0)),0);
    const monthlyDebtPaydown = Math.max(1, currentReduction, cashSurplus > 0 ? cashSurplus * .25 : 0) * scenarioConfig.multiplier;
    const d = futureDate(Math.ceil(totalDebt / monthlyDebtPaydown));
    rows.push({
      icon:"⚡",
      title:"Debt Free",
      label:dateLabel(d),
      detail:`${money(totalDebt)} remaining · projected payoff`,
      tone:"risk",
      category:"Freedom",
      sort:d ? d.getTime() : Number.MAX_SAFE_INTEGER - 6
    });
  }

  if (out > 0) {
    [
      { title:"Coast FIRE", icon:"🌤️", target:out*12*12, detail:"Approx. 12× annual spend", tone:"forecast" },
      { title:"FIRE", icon:"🔥", target:out*12*25, detail:"Approx. 25× annual spend", tone:"gain" }
    ].filter(m=>netWorth < m.target).forEach((m,i) => {
      const d = futureDate(monthsTo(m.target));
      rows.push({
        icon:m.icon,
        title:m.title,
        label:dateLabel(d),
        detail:`${money(m.target)} target · ${m.detail}`,
        tone:m.tone,
        category:"Independence",
        sort:d ? d.getTime() : Number.MAX_SAFE_INTEGER - 4 + i
      });
    });
  }

  return rows.sort((a,b)=>a.sort-b.sort).slice(0,10);
}

function timelineScenarioSummary(state, scenario = "balanced") {
  const latest = latestDashboardState(state);
  const totals = computeTotals(latest);
  const rows = buildWealthTimelineItems(state, scenario);
  const history = historyRows(latest).slice().sort((a,b)=>a.key.localeCompare(b.key)).filter(r=>Number.isFinite(Number(r.net)));
  const growths = history.slice(-6).map((r,i,arr)=> i ? Number(r.net||0) - Number(arr[i-1].net||0) : null).filter(v=>Number.isFinite(v));
  const avgGrowth = growths.length ? growths.reduce((s,v)=>s+v,0)/growths.length : Math.max(0, Number(totals.net||0)-Number(totals.prevNet||0));
  return { next: rows.find(r=>r.category !== "Today") || rows[0], avgGrowth, count: rows.length };
}


function InsightsStrip({ state, totals, openInsights }) {
  const insights = useMemo(() => buildGrowUpInsights(state, totals), [state, totals]);

  if (!insights.length) return null;

  return (
    <section className="growup-insights-strip scrollable-insights-strip" aria-label="Grow UP Insights">
      <div className="insights-strip-scroll">
        {insights.map((item, index) => (
          <article
            className={`insight-dashboard-card ${item.tone}`}
            key={`${item.title}-${index}`}
            onClick={openInsights}
          >
            <div className="insights-strip-head">
              <div>
                <p>{index === 0 ? "Grow UP Insights" : item.label}</p>
                <h2>{item.title}</h2>
              </div>
              <span>{item.icon}</span>
            </div>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}




function WealthTimelineBriefCard({ state, openTimeline }) {
  const items = useMemo(() => buildWealthTimelineItems(state, "balanced"), [state]);
  const summary = useMemo(() => timelineScenarioSummary(state, "balanced"), [state]);
  const next = summary.next;

  return (
    <section className="wealth-timeline-brief-card" onClick={openTimeline}>
      <div className="timeline-brief-copy">
        <p>Wealth Timeline</p>
        <h2>{next ? next.title : "Build your path"}</h2>
        <span>{next ? `${next.label} · ${next.detail}` : "Add goals to project future milestones."}</span>
      </div>

      <div className="timeline-brief-rail">
        {items.slice(0,4).map((item, index) => (
          <i key={`${item.title}-${index}`} className={item.tone}>
            {index === 0 ? "●" : index + 1}
          </i>
        ))}
      </div>

      <button type="button" aria-label="Open Wealth Timeline">→</button>
    </section>
  );
}


function InsightsPage({ state, totals, setMenuOpen, setInsightsOpen }) {
  const insights = useMemo(() => buildGrowUpInsights(state, totals), [state, totals]);

  return (
    <div className="screen insights-page">
      <div className="compound-header">
        <button className="round-nav-btn" onClick={()=>setInsightsOpen(false)} aria-label="Back">
          <ArrowLeft size={24}/>
        </button>
        <div>
          <h1>Grow UP Insights</h1>
          <p>Smart signals from your wealth data.</p>
        </div>
        <button className="mini-menu-btn" onClick={()=>setMenuOpen(true)} aria-label="Open menu">
          <Menu size={24}/>
        </button>
      </div>

      <section className="insight-hero-card">
        <span>Today’s read</span>
        <h2>{insights[0]?.title || "Add more data"}</h2>
        <p>{insights[0]?.body || "Save snapshots and goals to unlock richer insights."}</p>
      </section>

      <div className="insight-grid">
        {insights.map((item, index) => (
          <article className={`insight-card ${item.tone}`} key={`${item.title}-${index}`}>
            <div className="insight-icon">{item.icon}</div>
            <div>
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}


function WealthTimelinePage({ state, setMenuOpen, setTimelineOpen }) {
  const [scenario, setScenario] = useState("balanced");
  const items = useMemo(() => buildWealthTimelineItems(state, scenario), [state, scenario]);
  const summary = useMemo(() => timelineScenarioSummary(state, scenario), [state, scenario]);
  const scenarioLabel = scenario === "conservative" ? "Conservative" : scenario === "aggressive" ? "Aggressive" : "Balanced";

  return (
    <div className="screen wealth-timeline-page">
      <div className="compound-header">
        <button className="round-nav-btn" onClick={()=>setTimelineOpen(false)} aria-label="Back">
          <ArrowLeft size={24}/>
        </button>
        <div>
          <h1>Wealth Timeline</h1>
          <p>Your goals, milestones, and future wealth path.</p>
        </div>
        <button className="mini-menu-btn" onClick={()=>setMenuOpen(true)} aria-label="Open menu">
          <Menu size={24}/>
        </button>
      </div>

      <section className="timeline-hero timeline-v2-hero">
        <span>{scenarioLabel} projection</span>
        <h2>{summary.next?.label || "Build your timeline"}</h2>
        <p>{summary.next ? `Next up: ${summary.next.title}` : "Add goals to project your next milestones."}</p>

        <div className="timeline-projection-stats">
          <div><small>Recent pace</small><strong>{money(summary.avgGrowth)}/mo</strong></div>
          <div><small>Timeline points</small><strong>{summary.count}</strong></div>
        </div>
      </section>

      <div className="timeline-scenario-tabs">
        {[["conservative","Conservative"],["balanced","Balanced"],["aggressive","Aggressive"]].map(([key,label]) => (
          <button key={key} type="button" className={scenario === key ? "active" : ""} onClick={()=>setScenario(key)}>
            {label}
          </button>
        ))}
      </div>

      <section className="wealth-timeline-list">
        {items.map((item, index) => (
          <article className={`timeline-item ${item.tone}`} key={`${item.title}-${index}`}>
            <div className="timeline-node"><span>{item.icon}</span></div>
            <div className="timeline-content">
              <small>{item.category || item.label}</small>
              <h3>{item.title}</h3>
              <p>{item.label} · {item.detail}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}



function daysUntil(date) {
  if (!date) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.ceil((target - start) / (1000 * 60 * 60 * 24));
}

function nextTransactionDueDate(txn, from = new Date()) {
  return getNextOccurrence(txn, from);
}

function notificationPermissionStatus() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function requestGrowUpNotifications(setState) {
  if (!("Notification" in window)) {
    alert("Notifications are not supported by this browser.");
    return false;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    setState(s => ({ ...s, notificationsEnabled: true }));
    new Notification("Grow UP notifications enabled", {
      body: "You’ll get reminders for recurring transactions and monthly balance updates."
    });
    return true;
  }

  setState(s => ({ ...s, notificationsEnabled: false }));
  alert("Notifications were not enabled. You can turn them on later in your browser settings.");
  return false;
}

function showGrowUpNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification(title, { body });
  } catch {
    // Browser blocked it; fail silently.
  }
}

function runGrowUpNotificationChecks(state) {
  if (!state?.notificationsEnabled) return;
  if (notificationPermissionStatus() !== "granted") return;

  const todayKey = new Date().toISOString().slice(0, 10);
  const sentKey = `growup_notifications_sent_${todayKey}`;

  if (localStorage.getItem(sentKey)) return;

  const recurring = (state.transactions || [])
    .filter(t => t.recurring && normalizeFrequency(t.frequency) !== "oneOff")
    .map(t => ({ txn:t, due:nextTransactionDueDate(t) }))
    .filter(item => item.due)
    .map(item => ({ ...item, days:daysUntil(item.due) }))
    .filter(item => item.days !== null && item.days >= 0 && item.days <= 2)
    .slice(0, 3);

  if (recurring.length) {
    const first = recurring[0];
    showGrowUpNotification(
      `${first.txn.name} is due ${first.days === 0 ? "today" : first.days === 1 ? "tomorrow" : "soon"}`,
      `${first.txn.type === "income" ? "Expected income" : "Expected expense"}: ${money(first.txn.amount)}`
    );
  }

  const now = new Date();
  const isMonthEndWindow = now.getDate() >= 25 || now.getDate() <= 3;
  const balanceReminderKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

  if (isMonthEndWindow && localStorage.getItem("growup_last_balance_reminder") !== balanceReminderKey) {
    showGrowUpNotification(
      "Update your monthly balances",
      "Refresh asset and debt balances so your net worth timeline stays accurate."
    );
    localStorage.setItem("growup_last_balance_reminder", balanceReminderKey);
  }

  localStorage.setItem(sentKey, "true");
}


async function saveEmailReminderPreferences({ session, state, update, overrides = {} }) {
  const client = window.supabaseClient || window.supabase || (typeof supabase !== "undefined" ? supabase : null);

  if (!client) {
    alert("Supabase is not connected yet.");
    return false;
  }

  const user = session?.user;

  if (!user?.id || !user?.email) {
    alert("Please sign in to enable email reminders.");
    return false;
  }

  const nextPrefs = {
    emailRemindersEnabled: overrides.emailRemindersEnabled ?? state.emailRemindersEnabled ?? true,
    emailReminderDays: Number(overrides.emailReminderDays ?? state.emailReminderDays ?? 1),
    monthlyBalanceReminderDay: Number(overrides.monthlyBalanceReminderDay ?? state.monthlyBalanceReminderDay ?? 28),
    emailGoalReminders: overrides.emailGoalReminders ?? state.emailGoalReminders ?? true,
    emailMilestoneEmails: overrides.emailMilestoneEmails ?? state.emailMilestoneEmails ?? true
  };

  const payload = {
    user_id: user.id,
    email: user.email,
    enabled: Boolean(nextPrefs.emailRemindersEnabled),
    transaction_reminder_days: nextPrefs.emailReminderDays,
    monthly_balance_day: nextPrefs.monthlyBalanceReminderDay,
    goal_reminders: Boolean(nextPrefs.emailGoalReminders),
    milestone_emails: Boolean(nextPrefs.emailMilestoneEmails),
    updated_at: new Date().toISOString()
  };

  const { error } = await client
    .from("growup_email_preferences")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error(error);
    alert("Could not save email reminder preferences. Please check Supabase setup.");
    return false;
  }

  update(nextPrefs);
  return true;
}

async function loadEmailReminderPreferences({ session, update }) {
  const client = window.supabaseClient || window.supabase || (typeof supabase !== "undefined" ? supabase : null);

  if (!client || !session?.user?.id) return;

  const { data, error } = await client
    .from("growup_email_preferences")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data) return;

  update({
    emailRemindersEnabled: Boolean(data.enabled),
    emailReminderDays: Number(data.transaction_reminder_days ?? 1),
    monthlyBalanceReminderDay: Number(data.monthly_balance_day ?? 28),
    emailGoalReminders: Boolean(data.goal_reminders),
    emailMilestoneEmails: Boolean(data.milestone_emails)
  });
}


function OnboardingTips({ state, setState, setTab }) {
  if (state.onboardingDismissed) return null;

  const accountsDone = (state.accounts || []).length >= 2;
  const snapshotsDone = Object.keys(state.monthSnapshots || {}).length >= 2;
  const cashDone = (state.transactions || []).length >= 2;
  const goalsDone = (state.goals || []).filter(g => !g.archived).length >= 1;

  const steps = [
    { done: accountsDone, title:"Add your accounts", detail:"Start with the assets and debts that drive your net worth.", tab:"assets" },
    { done: snapshotsDone, title:"Update two months", detail:"Two saved months unlock more useful trends and forecasting.", tab:"assets" },
    { done: cashDone, title:"Add cash flow", detail:"Salary, rent, subscriptions, and recurring bills make insights smarter.", tab:"cash" },
    { done: goalsDone, title:"Create one goal", detail:"A single target gives the timeline something meaningful to project.", tab:"goals" }
  ];

  const completeCount = steps.filter(s => s.done).length;

  return (
    <section className="onboarding-tips-card">
      <div className="onboarding-head">
        <div>
          <p>Quick setup</p>
          <h2>Get the best from Grow UP</h2>
        </div>
        <button type="button" onClick={()=>setState(s=>({...s,onboardingDismissed:true}))}>×</button>
      </div>

      <div className="onboarding-progress">
        <i style={{ width:`${(completeCount / steps.length) * 100}%` }}></i>
      </div>

      <div className="onboarding-steps">
        {steps.map(step => (
          <button
            type="button"
            key={step.title}
            className={step.done ? "done" : ""}
            onClick={()=>setTab(step.tab)}
          >
            <span>{step.done ? "✓" : "○"}</span>
            <div>
              <strong>{step.title}</strong>
              <small>{step.detail}</small>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}



function enrichStateWithGoalSnapshotProgress(rawState) {
  try {
    const selectedMonth = rawState.selectedMonth || monthKey();
    const snapshot = rawState.monthSnapshots?.[selectedMonth];

    const accountsForMonth = snapshot?.accounts || rawState.accounts || [];
    const assets = accountsForMonth
      .filter(a => a.kind === "asset")
      .reduce((sum, a) => sum + Number(a.balance || 0), 0);

    const debts = accountsForMonth
      .filter(a => a.kind === "debt")
      .reduce((sum, a) => sum + Number(a.balance || 0), 0);

    const totalsForMonth = {
      assets,
      debts,
      net: assets - debts,
      prevNet: 0
    };

    const goalsWithProgress = (rawState.goals || []).map(goal => {
      let calc = calculateGoalProgress(goal, totalsForMonth, accountsForMonth);
      calc = refineDebtPayoffCalcWithHistory(goal, rawState, calc);

      const progress = Math.max(0, Math.min(100, Number(calc.progress || 0)));

      return {
        ...goal,
        progress,
        progressPercent: progress,
        calculatedCurrent: Number(calc.current || 0),
        calculatedTarget: Number(calc.target || goal.target || 0),
        calculatedRemaining: Number(calc.remaining || 0),
        progressSource: calc.sourceLabel || goal.account || "",
        progressGoalType: calc.goalType || goal.goalType || "",
        progressUpdatedAt: new Date().toISOString()
      };
    });

    const nextState = {
      ...rawState,
      goals: goalsWithProgress
    };

    if (snapshot) {
      nextState.monthSnapshots = {
        ...(rawState.monthSnapshots || {}),
        [selectedMonth]: {
          ...snapshot,
          goalProgress: goalsWithProgress.reduce((acc, goal) => {
            acc[goal.id] = {
              id: goal.id,
              name: goal.name,
              progress: goal.progress,
              progressPercent: goal.progressPercent,
              calculatedCurrent: goal.calculatedCurrent,
              calculatedTarget: goal.calculatedTarget,
              calculatedRemaining: goal.calculatedRemaining,
              progressSource: goal.progressSource,
              progressGoalType: goal.progressGoalType,
              updatedAt: goal.progressUpdatedAt
            };
            return acc;
          }, {})
        }
      };
    }

    return nextState;
  } catch (error) {
    console.error("Goal progress snapshot enrichment failed:", error);
    return rawState;
  }
}


function App() {
  const path = window.location.pathname;
  if (path === "/landingpage") return <LandingPage />;
  if (path === "/privacy") return <LegalPage type="privacy" />;
  if (path === "/terms") return <LegalPage type="terms" />;

  const [state, setState] = useGrowState();
  const [tab, setTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editor, setEditor] = useState(null);
  const [historyMetric, setHistoryMetric] = useState(null);
  const [compoundOpen, setCompoundOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(() => localStorage.getItem("growup_demo_mode") === "true");
  const [dashboardStyle, setDashboardStyle] = useState(() => localStorage.getItem("growup_dashboard_style") || "minimal");

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }, [state.theme]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setAuthLoading(false);
    });

    return () => data?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    if (isFutureMonth(state.selectedMonth)) {
      setState(s => ({ ...s, selectedMonth: currentMonthKey() }));
    }
  }, [state.selectedMonth, setState]);

  const activeState = useMemo(() => demoMode ? buildDemoState() : state, [demoMode, state]);
  const activeSetState = demoMode ? (() => readOnlyDemoAlert()) : setState;
  const totals = useMemo(() => computeTotals(activeState), [activeState]);
  const displayName = demoMode ? "Demo" : getUserDisplayName(session, state);

  useEffect(() => {
    if (!demoMode) runGrowUpNotificationChecks(activeState);
  }, [demoMode, activeState]);
  const update = (patch) => setState(s => ({ ...s, ...patch }));

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  };

  const enterDemoMode = () => {
    localStorage.setItem("growup_demo_mode", "true");
    setDemoMode(true);
    setMenuOpen(false);
  };

  const exitDemoMode = () => {
    localStorage.removeItem("growup_demo_mode");
    setDemoMode(false);
    setMenuOpen(false);
  };

  const updateDashboardStyle = (style) => {
    localStorage.setItem("growup_dashboard_style", style);
    setDashboardStyle(style);
    if (!demoMode) {
      setState(s => ({ ...s, dashboardStyle: style }));
    }
  };

  const saveSnapshot = async () => {
    if (demoMode) return readOnlyDemoAlert();
    if (!session?.user?.id) {
      alert("Please sign in before backing up your data.");
      return;
    }

    let nextStateForSupabase = null;
    let selectedMonthForMessage = state.selectedMonth;

    setState(currentState => {
      selectedMonthForMessage = currentState.selectedMonth;
      const existingSnapshot = currentState.monthSnapshots?.[currentState.selectedMonth];
      const sourceAccounts = existingSnapshot?.accounts || currentState.accounts;

      const cleanAccounts = sourceAccounts.map(a => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        kind: a.kind,
        balance: Number(a.balance || 0),
        previous: Number(a.previous || 0)
      }));

      const assets = cleanAccounts.filter(a => a.kind === "asset").reduce((sum, a) => sum + Number(a.balance || 0), 0);
      const debts = cleanAccounts.filter(a => a.kind === "debt").reduce((sum, a) => sum + Number(a.balance || 0), 0);

      const snapshot = {
        ...(existingSnapshot || {}),
        assets,
        debts,
        net: assets - debts,
        accounts: cleanAccounts,
        createdAt: existingSnapshot?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const next = {
        ...currentState,
        monthSnapshots: {
          ...(currentState.monthSnapshots || {}),
          [currentState.selectedMonth]: snapshot
        }
      };

      const enrichedNext = enrichStateWithGoalSnapshotProgress(next);

      nextStateForSupabase = enrichedNext;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enrichedNext));
      return enrichedNext;
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    if (!nextStateForSupabase) {
      alert("Could not save snapshot. Please try again.");
      return;
    }

    if (!supabase) {
      alert("Data backed up locally. Supabase env vars are missing.");
      return;
    }

    const { error } = await supabase
      .from("growup_snapshots")
      .insert({ user_id:session.user.id, app_state:nextStateForSupabase });

    if (error) return alert(`Local data saved, but cloud backup failed: ${error.message}`);
    alert(`Data backed up for ${monthLabel(selectedMonthForMessage)}.`);
  };

  const restoreSnapshot = async () => {
    if (demoMode) return readOnlyDemoAlert();
    if (!session?.user?.id) {
      alert("Please sign in before restoring your saved data.");
      return;
    }

    if (!supabase) return alert("Supabase env vars are missing.");
    if (!confirm("Restore your latest saved Grow UP data? This replaces local app data.")) return;

    const { data, error } = await supabase
      .from("growup_snapshots")
      .select("app_state, state, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending:false })
      .limit(1);

    if (error) return alert(`Restore failed: ${error.message}`);
    const restored = data?.[0]?.app_state || data?.[0]?.state;
    if (!restored) return alert("No saved backup found for this account.");

    setState({ ...EMPTY_STATE, ...restored });
    alert("Latest saved data restored.");
  };

  const changeDashboardStyle = (style) => {
    localStorage.setItem("growup_dashboard_style", style);
    setDashboardStyle(style);
    setState(s => ({ ...s, dashboardStyle: style }));
  };

  const common = { state: activeState, setState: activeSetState, totals, setEditor: demoMode ? (() => readOnlyDemoAlert()) : setEditor, setMenuOpen, setHistoryMetric, setInsightsOpen, setTimelineOpen, saveSnapshot, displayName, isDemo: demoMode};

  if (authLoading) {
    return (
      <div className="app-shell">
        <main className="phone auth-phone">
          <div className="auth-loading">
            <div className="app-icon large">GV</div>
            <h1>Grow UP</h1>
            <p>Checking your session…</p>
          </div>
        </main>
      </div>
    );
  }

  if (!session && !demoMode) {
    return <AuthScreen enterDemoMode={enterDemoMode} />;
  }

  return (
    <div className="app-shell">
      <main className="phone">
        {timelineOpen ? (
          <WealthTimelinePage state={activeState} setMenuOpen={setMenuOpen} setTimelineOpen={setTimelineOpen} />
        ) : insightsOpen ? (
          <InsightsPage state={activeState} totals={totals} setMenuOpen={setMenuOpen} setInsightsOpen={setInsightsOpen} />
        ) : compoundOpen ? (
          <CompoundWealthPage setCompoundOpen={setCompoundOpen} setMenuOpen={setMenuOpen} />
        ) : historyMetric ? (
          <HistoryPage {...common} metric={historyMetric} setHistoryMetric={setHistoryMetric} />
        ) : (
          <>
            {tab === "overview" && !demoMode && (
              <OnboardingTips state={state} setState={setState} setTab={setTab} />
            )}

            {tab === "overview" && (
              dashboardStyle === "detailed"
                ? <Overview {...common} setTab={setTab} isDemo={demoMode} />
                : <MinimalOverview {...common} setTab={setTab} isDemo={demoMode} />
            )}
            {tab === "assets" && <AssetsDebts {...common} />}
            {tab === "cash" && <CashFlow {...common} />}
            {tab === "goals" && <Goals {...common} setCompoundOpen={setCompoundOpen} />}
            {tab === "settings" && (
              <Settings
                state={activeState}
                update={update}
                saveSnapshot={saveSnapshot}
                restoreSnapshot={restoreSnapshot}
                setMenuOpen={setMenuOpen}
                session={session}
                displayName={displayName}
                signOut={signOut}
                isDemo={demoMode}
                enterDemoMode={enterDemoMode}
                exitDemoMode={exitDemoMode}
                dashboardStyle={dashboardStyle}
                setDashboardStyle={updateDashboardStyle}
              />
            )}
            <BottomNav tab={tab} setTab={setTab} />
          </>
        )}
      </main>

      {menuOpen && (
        <MenuSheet
          state={activeState}
          setMenuOpen={setMenuOpen}
          setTab={setTab}
          setTimelineOpen={setTimelineOpen}
          setInsightsOpen={setInsightsOpen}
          update={update}
          saveSnapshot={saveSnapshot}
          restoreSnapshot={restoreSnapshot}
          session={session}
          displayName={displayName}
          signOut={signOut}
          isDemo={demoMode}
          enterDemoMode={enterDemoMode}
          exitDemoMode={exitDemoMode}
        />
      )}

      {!demoMode && editor && <EditorModal editor={editor} setEditor={setEditor} state={state} setState={setState} />}
    </div>
  );
}

function AuthScreen({ enterDemoMode }) {
  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const canSubmit = email.trim() && password.length >= 6;

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured. Check your Cloudflare environment variables.");
      return;
    }

    if (!canSubmit) {
      setMessage("Enter an email and a password with at least 6 characters.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signUp") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { first_name: firstName.trim() || email.trim().split("@")[0] } }
        });

        if (error) throw error;
        setMessage("Account created. Check your email if Supabase asks for confirmation, then sign in.");
        setMode("signIn");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) setMessage(error.message || "Google sign-in failed.");
  };

  const resetPassword = async () => {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    if (!email.trim()) {
      setMessage("Enter your email first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin
    });

    if (error) setMessage(error.message);
    else setMessage("Password reset email sent.");
  };

  return (
    <div className="app-shell">
      <main className="phone auth-phone">
        <section className="auth-card">
          <div className="app-icon large">GV</div>
          <h1>Grow UP</h1>
          <p>Sign in to sync your snapshots, goals, and wealth progress.</p>

          <div className="auth-tabs">
            <button className={mode === "signIn" ? "active" : ""} onClick={()=>setMode("signIn")}>Sign in</button>
            <button className={mode === "signUp" ? "active" : ""} onClick={()=>setMode("signUp")}>Create account</button>
          </div>

          <button className="google-auth-btn" onClick={signInWithGoogle} type="button">
            <span>G</span>
            Continue with Google
          </button>

          <div className="auth-divider"><span>or</span></div>

          <form onSubmit={submit}>
            {mode === "signUp" && (
              <label>
                First name
                <input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Your first name" />
              </label>
            )}

            <label>
              Email
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </label>

            <label>
              Password
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 6 characters" autoComplete={mode === "signIn" ? "current-password" : "new-password"} />
            </label>

            {message && <div className="auth-message">{message}</div>}

            <button className="primary full" disabled={busy || !canSubmit}>
              {busy ? "Please wait…" : mode === "signIn" ? "Sign in" : "Create account"}
            </button>
          </form>

          {mode === "signIn" && (
            <button className="link-btn" onClick={resetPassword}>Forgot password?</button>
          )}

          <button className="demo-auth-btn" type="button" onClick={enterDemoMode}>
            Explore Demo
          </button>

          <div className="auth-legal-links">
            <a href="/privacy">Privacy Policy</a>
            <span>•</span>
            <a href="/terms">Terms</a>
          </div>
        </section>
      </main>
    </div>
  );
}


function latestDashboardState(state) {
  const snapshotKeys = Object.keys(state.monthSnapshots || {}).filter(key => !isFutureMonth(key));
  const latestSnapshotKey = snapshotKeys.length ? snapshotKeys.sort().at(-1) : null;
  const selectedMonth = latestSnapshotKey || currentMonthKey();
  return { ...state, selectedMonth };
}

function computeTotals(state) {
  const current = state.monthSnapshots?.[state.selectedMonth];
  const prevKey = addMonths(state.selectedMonth, -1);
  const prev = state.monthSnapshots?.[prevKey];

  const accountSource = current?.accounts || state.accounts;
  const assets = accountSource.filter(a => a.kind === "asset").reduce((s,a)=>s+Number(a.balance || 0),0);
  const debts = accountSource.filter(a => a.kind === "debt").reduce((s,a)=>s+Number(a.balance || 0),0);

  // Rule: if a previous month was not entered and saved, previous balances are zero.
  const prevAssets = prev ? Number(prev.assets || 0) : 0;
  const prevDebts = prev ? Number(prev.debts || 0) : 0;

  const income = state.transactions
    .filter(t => t.type === "income" && t.recurring)
    .reduce((s,t)=>s+monthlyEquivalent(t),0);

  const expenses = state.transactions
    .filter(t => t.type === "expense" && t.recurring)
    .reduce((s,t)=>s+monthlyEquivalent(t),0);

  return { assets, debts, net: assets-debts, prevAssets, prevDebts, prevNet: prevAssets-prevDebts, income, expenses };
}

function ScreenTitle({ title, sub, setMenuOpen, back }) {
  return (
    <section className="page-header">
      {back && <button className="round-nav-btn" onClick={back}><ArrowLeft size={24}/></button>}
      <div className="title-block">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <button className="mini-menu-btn" onClick={() => setMenuOpen?.(true)} aria-label="Open menu"><Menu size={22}/></button>
    </section>
  );
}

function MonthBar({ state, setState, thin=false }) {
  const nextMonth = addMonths(state.selectedMonth, 1);
  const nextBlocked = !canMoveToMonth(nextMonth);

  const move = (delta) => {
    const target = addMonths(state.selectedMonth, delta);
    if (!canMoveToMonth(target)) return;
    setState(s => ({ ...s, selectedMonth:target }));
  };

  return (
    <div className={thin ? "month-bar thin" : "month-bar"}>
      <button onClick={()=>move(-1)} aria-label="Previous month"><ChevronLeft size={24}/></button>
      <strong>{monthLabel(state.selectedMonth)}</strong>
      <button
        className={nextBlocked ? "blocked" : ""}
        disabled={nextBlocked}
        onClick={()=>move(1)}
        aria-label={nextBlocked ? "Future months are blocked" : "Next month"}
      >
        <ChevronRight size={24}/>
      </button>
    </div>
  );
}

function EmptyState({ title, text, action, onClick }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
      {action && <button className="primary" onClick={onClick}><Plus size={18}/>{action}</button>}
    </div>
  );
}


function useAnimatedNumber(targetValue, startValue = 0, duration = 1100) {
  const [value, setValue] = useState(startValue);

  useEffect(() => {
    let frame;
    const startTime = performance.now();
    const from = Number(startValue || 0);
    const to = Number(targetValue || 0);
    const diff = to - from;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easeOutCubic(progress);
      setValue(from + diff * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    setValue(from);
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [targetValue, startValue, duration]);

  return value;
}

function sixMonthAnimationStart(state, fallbackValue) {
  const rows = historyRows(state).sort((a, b) => a.key.localeCompare(b.key));
  const selectedIndex = rows.findIndex(r => r.key === state.selectedMonth);

  if (selectedIndex >= 0) {
    const startIndex = Math.max(0, selectedIndex - 5);
    return Number(rows[startIndex]?.net || 0);
  }

  const latestSix = rows.slice(-6);
  if (latestSix.length) return Number(latestSix[0].net || 0);

  return Number(fallbackValue || 0);
}



function CompactOverviewHeader({ title, sub, isDemo=false, setMenuOpen }) {
  return (
    <div className="compact-overview-header">
      <div className="compact-title-block">
        <div className="compact-title-line">
          <h1>{title}</h1>
          <span className={isDemo ? "mode-pill demo-mode-pill" : "mode-pill real-mode-pill"}>
            {isDemo ? "Demo Mode" : "Real Mode"}
          </span>
        </div>
        {sub && <p>{sub}</p>}
      </div>

      <button className="top-menu-btn compact-menu-btn" onClick={()=>setMenuOpen(true)} aria-label="Open menu">
        <Menu size={26}/>
      </button>
    </div>
  );
}




function selectSmartDashboardGoal(goals, dashboardState, dashboardTotals, accounts) {
  const activeGoals = (goals || []).filter(g => !g.archived);
  if (!activeGoals.length) return null;

  const enriched = activeGoals.map(goal => {
    let calc = calculateGoalProgress(goal, dashboardTotals, accounts);
    calc = refineDebtPayoffCalcWithHistory(goal, dashboardState, calc);
    const forecast = estimateGoalCompletion(goal, dashboardState, calc);

    const deadlineScore = goal.deadline
      ? Math.max(0, new Date(goal.deadline).getTime() - Date.now())
      : Number.MAX_SAFE_INTEGER;

    const offTrackScore = Math.max(0, 100 - Number(calc.progress || 0));
    const progressScore = Number(calc.progress || 0);

    return {
      goal,
      calc,
      forecast,
      deadlineScore,
      offTrackScore,
      progressScore
    };
  });

  const modes = [
    enriched.slice().sort((a,b)=>a.deadlineScore-b.deadlineScore)[0],
    enriched.slice().sort((a,b)=>b.offTrackScore-a.offTrackScore)[0],
    enriched.slice().sort((a,b)=>b.progressScore-a.progressScore)[0]
  ].filter(Boolean);

  const uniqueModes = [];
  const seen = new Set();

  for (const item of modes) {
    if (!seen.has(item.goal.id || item.goal.name)) {
      seen.add(item.goal.id || item.goal.name);
      uniqueModes.push(item);
    }
  }

  const rotationIndex = Math.floor(Date.now() / 8000) % uniqueModes.length;

  return uniqueModes[rotationIndex] || uniqueModes[0];
}


function weightedThreeMonthMomentum(state, currentNet) {
  const rows = historyRows(state)
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .filter(r => Number.isFinite(Number(r.net)));

  if (rows.length < 2) return 0;

  const latest = Number(currentNet ?? rows.at(-1)?.net ?? 0);
  const comparisons = rows.slice(-4, -1).map((row, index, arr) => {
    const previous = Number(row.net || 0);
    if (!previous) return 0;
    const growth = ((latest - previous) / Math.abs(previous)) * 100;
    // Heavier weight on more recent months.
    const weights = [0.2, 0.3, 0.5];
    return growth * weights[Math.max(0, 3 - arr.length + index)];
  });

  const usedWeights = comparisons.length === 1 ? 0.5 : comparisons.length === 2 ? 0.8 : 1;
  const score = comparisons.reduce((sum, value) => sum + value, 0) / usedWeights;

  return Math.round(score);
}



function upcomingTransactionsForDashboard(state, limit = 4) {
  return upcomingTransactions(state.transactions || [], 365)
    .map(txn => ({
      ...txn,
      dateObj: new Date(txn.occurrenceDate || txn.date)
    }))
    .filter(txn => txn.dateObj && !Number.isNaN(txn.dateObj.getTime()))
    .slice(0, limit);
}



function useAutoCarousel(itemCount = 3, intervalMs = 5200, resumeDelayMs = 5200) {
  const ref = React.useRef(null);
  const timerRef = React.useRef(null);
  const resumeRef = React.useRef(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const scrollToIndex = React.useCallback((nextIndex) => {
    const el = ref.current;
    if (!el || itemCount <= 0) return;

    const clamped = ((nextIndex % itemCount) + itemCount) % itemCount;
    const child = el.children?.[clamped];

    if (child) {
      el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
    }

    setIndex(clamped);
  }, [itemCount]);

  const pauseThenResume = React.useCallback(() => {
    setPaused(true);
    window.clearTimeout(resumeRef.current);
    resumeRef.current = window.setTimeout(() => setPaused(false), resumeDelayMs);
  }, [resumeDelayMs]);

  useEffect(() => {
    if (paused || itemCount <= 1) return;

    timerRef.current = window.setInterval(() => {
      scrollToIndex(index + 1);
    }, intervalMs);

    return () => window.clearInterval(timerRef.current);
  }, [paused, index, itemCount, intervalMs, scrollToIndex]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const children = Array.from(el.children || []);
      if (!children.length) return;

      const nearest = children.reduce((best, child, i) => {
        const distance = Math.abs(child.offsetLeft - el.scrollLeft);
        return distance < best.distance ? { index: i, distance } : best;
      }, { index: 0, distance: Infinity });

      setIndex(nearest.index);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => () => {
    window.clearInterval(timerRef.current);
    window.clearTimeout(resumeRef.current);
  }, []);

  return { ref, index, scrollToIndex, pauseThenResume };
}


function MinimalOverview({ state, totals, setMenuOpen, setHistoryMetric, setTab, displayName, setInsightsOpen, setTimelineOpen, isDemo=false }) {
  const dashboardState = useMemo(() => latestDashboardState(state), [state]);
  const dashboardTotals = useMemo(() => computeTotals(dashboardState), [dashboardState]);
  const accounts = getAccountsForSelectedMonth(dashboardState);
  const topAsset = accounts
    .filter(a => a.kind === "asset" && Number(a.balance || 0) > 0)
    .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0];
  const topAssetPercent = topAsset && dashboardTotals.assets
    ? Math.round((Number(topAsset.balance || 0) / Math.max(1, dashboardTotals.assets)) * 1000) / 10
    : 0;
  const topAssetCirc = 2 * Math.PI * 42;
  const goals = dashboardState.goals.filter(g => !g.archived);
  const smartGoal = selectSmartDashboardGoal(goals, dashboardState, dashboardTotals, accounts);
  const primaryGoal = smartGoal?.goal || goals[0] || null;

  const animatedStartNetWorth = sixMonthAnimationStart(dashboardState, dashboardTotals.prevNet || dashboardTotals.net);
  const animatedNetWorth = useAnimatedNumber(dashboardTotals.net, animatedStartNetWorth, 1300);
  const momentumScore = weightedThreeMonthMomentum(dashboardState, dashboardTotals.net);
  const animatedMomentum = useAnimatedNumber(momentumScore, 0, 1100);

  const upcomingMiniTxns = upcomingTransactionsForDashboard(dashboardState, 4);
  const dashboardCarousel = useAutoCarousel(3, 5600, 5200);
  const chartRows = historyRows(dashboardState).slice().reverse().slice(-6);
  const chartValues = chartRows.map(r => Number(r.net || 0));
  const min = Math.min(...chartValues, dashboardTotals.net);
  const max = Math.max(...chartValues, dashboardTotals.net);
  const range = Math.max(1, max - min);
  const points = chartValues.length
    ? chartValues.map((v, i) => {
        const x = chartValues.length === 1 ? 0 : (i / (chartValues.length - 1)) * 300;
        const y = 128 - ((v - min) / range) * 104;
        return `${x},${y}`;
      }).join(" ")
    : "0,120 300,80";

  let goalCalc = smartGoal?.calc || null;
  let goalForecast = smartGoal?.forecast || null;

  if (primaryGoal && !goalCalc) {
    goalCalc = calculateGoalProgress(primaryGoal, dashboardTotals, accounts);
    goalCalc = refineDebtPayoffCalcWithHistory(primaryGoal, dashboardState, goalCalc);
    goalForecast = estimateGoalCompletion(primaryGoal, dashboardState, goalCalc);
  }

  return (
    <div className="screen minimal-dashboard-screen">
      <div className="minimal-dashboard-head compact-minimal-head">
        <div className="minimal-title-block">
          <div className="minimal-greeting-line">
            <p>Welcome back</p>
            <span className={isDemo ? "mode-pill demo-mode-pill" : "mode-pill real-mode-pill"}>
              {isDemo ? "Demo Mode" : "Real Mode"}
            </span>
          </div>
          <h1>{displayName || "there"}</h1>
        </div>
        <button className="top-menu-btn compact-menu-btn" onClick={()=>setMenuOpen(true)} aria-label="Open menu">
          <Menu size={26}/>
        </button>
      </div>

      <section className="minimal-networth-card" onClick={()=>setHistoryMetric("net")}>
        <p>Net Worth</p>
        <h2>{money(animatedNetWorth)}</h2>
        <span>{signedMoney(dashboardTotals.net - dashboardTotals.prevNet)} over last month</span>
      </section>

      <InsightsStrip state={dashboardState} totals={dashboardTotals} openInsights={()=>setInsightsOpen?.(true)} />

      <WealthTimelineBriefCard state={dashboardState} openTimeline={()=>setTimelineOpen?.(true)} />

      {primaryGoal && goalCalc && (
        <section className={`minimal-goal-card ${primaryGoal.color || "green"}`} onClick={()=>setTab("goals")}>
          <div className="minimal-row">
            <div>
              <p>
                {smartGoal?.goal === primaryGoal && smartGoal?.deadlineScore < 1000 * 60 * 60 * 24 * 120
                  ? "Closest deadline"
                  : smartGoal?.goal === primaryGoal && smartGoal?.offTrackScore > 40
                  ? "Long-term wealth path"
                  : "Top progress"}
              </p>
              <h2>{primaryGoal.name}</h2>
            </div>
            <strong>{Math.round(goalCalc.progress)}%</strong>
          </div>
          <div className="minimal-progress">
            <i style={{ width:`${Math.min(100, Math.max(0, goalCalc.progress))}%` }}></i>
          </div>
          <div className="minimal-forecast-box">
            <p>Forecast Finish</p>
            <h3>{goalForecast?.label || "Need more history"}</h3>
            <span>{goalForecast?.detail || "Save more snapshots to improve forecasting."}</span>
          </div>
        </section>
      )}

      <section className="minimal-feature-carousel" aria-label="Dashboard highlights">
        <div
          className="feature-track"
          ref={dashboardCarousel.ref}
          onTouchStart={dashboardCarousel.pauseThenResume}
          onMouseDown={dashboardCarousel.pauseThenResume}
          onWheel={dashboardCarousel.pauseThenResume}
          onScroll={dashboardCarousel.pauseThenResume}
        >
          <article className="minimal-chart-card feature-slide dark-momentum-card">
            <div className="minimal-row">
              <div>
                <p>3-month weighted trend</p>
                <h2>Momentum</h2>
              </div>
              <strong>{animatedMomentum >= 0 ? "+" : ""}{Math.round(animatedMomentum)}%</strong>
            </div>

            <svg viewBox="0 0 300 140" className="minimal-trend-svg" onClick={()=>setHistoryMetric("net")}>
              <polyline points={points} />
            </svg>

            <span className="feature-caption">
              {animatedMomentum >= 10 ? "Strong positive trend" : animatedMomentum >= 0 ? "Positive trend" : "Long-term wealth path"}
            </span>
          </article>

          <article className="minimal-upcoming-card feature-slide">
            <div className="upcoming-card-head">
              <div>
                <p>Upcoming</p>
                <h2>Transactions</h2>
              </div>
              <button type="button" onClick={()=>setTab("cash")} aria-label="Open Cash Flow">→</button>
            </div>

            <div className="upcoming-mini-list">
              {upcomingMiniTxns.length ? upcomingMiniTxns.map(txn => (
                <div className="upcoming-mini-item" key={txn.id}>
                  <span>{txn.icon || (txn.type === "income" ? "💵" : "💳")}</span>
                  <div>
                    <strong>{txn.name}</strong>
                    <small>{txn.dateObj.toLocaleDateString("en-US", { month:"short", day:"numeric" })}</small>
                  </div>
                  <b className={txn.type === "income" ? "gain" : "risk"}>
                    {txn.type === "income" ? "+" : "-"}{money(txn.amount)}
                  </b>
                </div>
              )) : (
                <div className="upcoming-empty">No upcoming transactions.</div>
              )}
            </div>
          </article>

          <article className="minimal-cash-snapshot-card feature-slide">
            <div className="upcoming-card-head">
              <div>
                <p>This month</p>
                <h2>Cash Flow</h2>
              </div>
              <button type="button" onClick={()=>setTab("cash")} aria-label="Open Cash Flow">→</button>
            </div>

            <div className="cash-snapshot-big">
              <strong>{signedMoney(dashboardTotals.income - dashboardTotals.expenses)}</strong>
              <span>projected balance</span>
            </div>

            <div className="cash-bars">
              <i></i><i></i><i></i><i></i><i></i>
            </div>
          </article>
        </div>

        <div className="feature-dots">
          {[0,1,2].map(i => (
            <button
              key={i}
              type="button"
              className={dashboardCarousel.index === i ? "active" : ""}
              onClick={() => {
                dashboardCarousel.pauseThenResume();
                dashboardCarousel.scrollToIndex(i);
              }}
              aria-label={`Show dashboard card ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {topAsset && (
        <section className="minimal-top-asset-card" onClick={()=>setHistoryMetric("assets")}>
          <div className="minimal-top-asset-copy">
            <div className="top-asset-label">
              <span>◔</span>
              <b>Top Asset</b>
            </div>
            <p>{topAsset.name}</p>
            <h2>{money(topAsset.balance)}</h2>
            <small>{topAssetPercent}% of total assets</small>
          </div>

          <div className="top-asset-ring" style={{ "--assetPercent": topAssetPercent }}>
            <svg viewBox="0 0 100 100">
              <circle className="ring-bg" cx="50" cy="50" r="42" />
              <circle
                className="ring-fill"
                cx="50"
                cy="50"
                r="42"
                strokeDasharray={topAssetCirc}
                strokeDashoffset={topAssetCirc - (topAssetCirc * topAssetPercent / 100)}
              />
            </svg>
            <strong>{topAssetPercent}%</strong>
          </div>
        </section>
      )}

      <section className="minimal-split-card">
        <button onClick={()=>setHistoryMetric("assets")}><span>Total Assets</span><strong>{money(dashboardTotals.assets)}</strong></button>
        <button onClick={()=>setHistoryMetric("debts")}><span>Total Debts</span><strong>{money(dashboardTotals.debts)}</strong></button>
      </section>
    </div>
  );
}

function Overview({  state, totals, setEditor, setTab, setMenuOpen, setHistoryMetric, displayName, isDemo = false}) {
  const dashboardState = useMemo(() => latestDashboardState(state), [state]);
  const dashboardTotals = useMemo(() => computeTotals(dashboardState), [dashboardState]);
  const dashboardMonthLabel = monthLabel(dashboardState.selectedMonth);

  const completedGoals = dashboardState.goals.filter(g =>
    calculateGoalProgress(g, dashboardTotals, getAccountsForSelectedMonth(dashboardState)).progress >= 100
  ).length;

  const upcoming = upcomingTransactions(dashboardState.transactions, 7);
  const chartData = historyRows(dashboardState).slice().reverse().map(r => ({ m:shortMonthLabel(r.key), net:r.net }));

  const animatedStartNetWorth = sixMonthAnimationStart(dashboardState, dashboardTotals.prevNet || dashboardTotals.net);
  const animatedNetWorth = useAnimatedNumber(dashboardTotals.net, animatedStartNetWorth, 1300);

  return (
    <div className="screen">
      <CompactOverviewHeader
        title={`Welcome, ${displayName || "there"}`}
        sub={`Here's your Snapshot for ${dashboardMonthLabel}`}
        isDemo={isDemo}
        setMenuOpen={setMenuOpen}
      />

      <InsightsStrip state={state} totals={totals} openInsights={()=>setInsightsOpen?.(true)} />

      <WealthTimelineBriefCard state={state} openTimeline={()=>setTimelineOpen?.(true)} />

      <div className="kpi-grid">
        <Kpi onClick={()=>setHistoryMetric("assets")} title="Total Assets" value={money(dashboardTotals.assets)} sub={`${signedMoney(dashboardTotals.assets - dashboardTotals.prevAssets)} vs last month`} icon="💼" dot="green" />
        <Kpi onClick={()=>setHistoryMetric("debts")} title="Total Debts" value={money(dashboardTotals.debts)} sub={`${signedMoney(dashboardTotals.debts - dashboardTotals.prevDebts)} vs last month`} icon="💳" dot="red" />
        <Kpi onClick={()=>setHistoryMetric("net")} title="Net Worth" value={money(animatedNetWorth)} sub={`${signedMoney(dashboardTotals.net - dashboardTotals.prevNet)} vs last month`} icon="$" dot="blue" animated />
        <Kpi onClick={()=>setTab("goals")} title="Goals" value={`${completedGoals} / ${state.goals.length}`} sub="completed" icon="🎯" dot="purple" />
      </div>

      {state.accounts.length === 0 && state.goals.length === 0 && state.transactions.length === 0 && (
        <EmptyState title="Start building your snapshot" text="Add your first account, goal, or cash flow item. Nothing is hard-coded." action="Add account" onClick={()=>setEditor({ type:"account" })}/>
      )}

      <Card className="networth-trend-card">
        <div className="card-head">
          <span className="green-square"><TrendingUp size={22}/></span>
          <div><h2>Net Worth Trend</h2><p>Use the dropdown for History</p></div>
          <button className="trend-history-btn" onClick={(e)=>{ e.stopPropagation(); setHistoryMetric("net"); }} aria-label="Open net worth history"><ChevronDown size={22}/></button>
        </div>
        <div className="trend-box">
          <div><span>Current Net Worth</span><strong className="counting-networth">{money(animatedNetWorth)}</strong></div>
          <div><span>Snapshots</span><strong className="success">{Object.keys(state.monthSnapshots || {}).length}</strong></div>
        </div>
        <div className="chart-holder">
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={chartData.length ? chartData : [{m:"Now", net:totals.net}]}>
              <XAxis dataKey="m" hide />
              <YAxis hide />
              <Tooltip formatter={(v)=>money(v)} />
              <Line type="monotone" dataKey="net" stroke="#3fa463" strokeWidth={3} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="cash-card" onClick={()=>setTab("cash")}>
        <div className="card-head">
          <span className="blue-square"><Repeat2 size={22}/></span>
          <h2>Cash Flow</h2>
        </div>
        <div className="mini-pair">
          <div><span>Money In (monthly)</span><strong>{money(dashboardTotals.income)}</strong></div>
          <div><span>Money Out (monthly)</span><strong>{money(dashboardTotals.expenses)}</strong></div>
        </div>
        <div className="upcoming-head"><h3>Upcoming <span>· Next 7 days</span></h3><span>{upcoming.length} upcoming</span></div>
        {upcoming.length ? upcoming.slice(0,4).map(t => <CompactTxn key={t.id} t={t}/>) : <p className="muted">No upcoming transactions yet.</p>}
      </Card>
    </div>
  );
}

function Kpi({ title, value, sub, icon, dot, onClick, animated=false }) {
  return (
    <button className={animated ? "kpi kpi-animated" : "kpi"} onClick={onClick}>
      <div className={`emoji-badge ${dot}`}>{icon}</div>
      <span className={`dot ${dot}`}></span>
      <p>{title}</p>
      <h2>{value}</h2>
      <small>{sub}</small>
    </button>
  );
}

function AssetsDebts({ state, setState, totals, setEditor, setMenuOpen, setHistoryMetric, saveSnapshot, isDemo=false }) {
  const [editingBalances, setEditingBalances] = useState(false);
  const [assetMenuOpen, setAssetMenuOpen] = useState(false);
  const selectedSnapshot = state.monthSnapshots?.[state.selectedMonth];
  const prevSnapshot = state.monthSnapshots?.[addMonths(state.selectedMonth, -1)];

  const displayedAccounts = selectedSnapshot?.accounts || state.accounts;
  const accountsWithPrev = displayedAccounts.map(account => {
    const prevAccount = prevSnapshot?.accounts?.find(a => a.id === account.id);
    // Rule: if previous month has no saved account balance, assume zero.
    const previous = prevAccount ? Number(prevAccount.balance || 0) : 0;
    return { ...account, previous };
  });

  const assets = accountsWithPrev.filter(a => a.kind === "asset");
  const debts = accountsWithPrev.filter(a => a.kind === "debt");

  const updateBalance = (id, value) => {
    const numericValue = Number(value || 0);

    setState(s => {
      const existingSnapshot = s.monthSnapshots?.[s.selectedMonth];

      // If this month already has a snapshot, edit that snapshot directly.
      if (existingSnapshot) {
        const updatedAccounts = (existingSnapshot.accounts || s.accounts).map(a =>
          a.id === id ? { ...a, balance:numericValue } : a
        );

        const assets = updatedAccounts.filter(a => a.kind === "asset").reduce((sum, a) => sum + Number(a.balance || 0), 0);
        const debts = updatedAccounts.filter(a => a.kind === "debt").reduce((sum, a) => sum + Number(a.balance || 0), 0);

        return {
          ...s,
          monthSnapshots: {
            ...s.monthSnapshots,
            [s.selectedMonth]: {
              ...existingSnapshot,
              accounts: updatedAccounts,
              assets,
              debts,
              net: assets - debts,
              updatedAt: new Date().toISOString()
            }
          }
        };
      }

      // If no snapshot exists yet, edit live account balances.
      const priorSnapshot = s.monthSnapshots?.[addMonths(s.selectedMonth, -1)];

      return {
        ...s,
        accounts: s.accounts.map(a => {
          if (a.id !== id) return a;
          const priorAccount = priorSnapshot?.accounts?.find(pa => pa.id === a.id);
          return {
            ...a,
            previous: priorAccount ? Number(priorAccount.balance || 0) : 0,
            balance:numericValue
          };
        })
      };
    });
  };

  const openAddAccount = (kind) => {
    if (isDemo) return readOnlyDemoAlert();
    setAssetMenuOpen(false);
    setEditor({ type:"account", defaultKind:kind });
  };

  const toggleBalanceEdit = () => {
    if (isDemo) return readOnlyDemoAlert();
    setAssetMenuOpen(false);
    if (state.accounts.length === 0) {
      setEditor({ type:"account", defaultKind:"asset" });
      return;
    }
    setEditingBalances(value => !value);
  };

  const saveAndClose = () => {
    if (isDemo) return readOnlyDemoAlert();
    setAssetMenuOpen(false);
    saveSnapshot();
  };

  return (
    <div className="screen">
      <ScreenTitle title="Assets & Debts" sub="Update balances month-to-month. Changes feed your Overview." setMenuOpen={setMenuOpen} />
      <MonthBar state={state} setState={setState} thin />

      {selectedSnapshot && (
        <div className="snapshot-banner">
          Historical snapshot · {editingBalances ? "editing enabled" : "locked"}
        </div>
      )}

      {state.accounts.length === 0 ? (
        <EmptyState title="No accounts yet" text="Add assets and debts to calculate net worth." action="Add account" onClick={()=>openAddAccount("asset")}/>
      ) : (
        <>
          <AccountGroup
            title={`Assets (${assets.length})`}
            sub="Enter this month's values; see last month + change."
            accounts={assets}
            updateBalance={updateBalance}
            readOnly={!!selectedSnapshot && !editingBalances}
            editingBalances={editingBalances}
            setEditor={setEditor}
            setState={setState}
          />
          <AccountGroup
            title={`Debts (${debts.length})`}
            sub="Enter this month's amounts owed; see last month + change."
            accounts={debts}
            updateBalance={updateBalance}
            readOnly={!!selectedSnapshot && !editingBalances}
            editingBalances={editingBalances}
            setEditor={setEditor}
            setState={setState}
          />
          <Card className="summary-list">
            <div onClick={()=>setHistoryMetric("assets")}><span>Assets (this month)</span><strong>{money(totals.assets)}</strong></div>
            <div onClick={()=>setHistoryMetric("debts")}><span>Debts (this month)</span><strong>{money(totals.debts)}</strong></div>
            <div className="bold" onClick={()=>setHistoryMetric("net")}><span>Net Worth</span><strong>{money(totals.net)}</strong></div>
          </Card>
        </>
      )}

      {assetMenuOpen && (
        <div className="asset-fab-menu">
          <button onClick={()=>openAddAccount("asset")}><span className="menu-icon green">+</span><b>Add Asset</b></button>
          <button onClick={()=>openAddAccount("debt")}><span className="menu-icon red">+</span><b>Add Debt</b></button>
          <button onClick={toggleBalanceEdit}><span className="menu-icon gray">✎</span><b>{editingBalances ? "Done Editing" : "Edit Balances"}</b></button>
          <button onClick={saveAndClose}><span className="menu-icon gray">💾</span><b>Save Month Snapshot</b></button>
        </div>
      )}

      <button
        className={editingBalances || assetMenuOpen ? "fab edit-active" : "fab"}
        onClick={() => {
          if (editingBalances) {
            setEditingBalances(false);
            return;
          }
          if (isDemo) return readOnlyDemoAlert();
          setAssetMenuOpen(value => !value);
        }}
        aria-label={editingBalances ? "Finish editing balances" : assetMenuOpen ? "Close asset actions" : "Open asset actions"}
      >
        {editingBalances ? (
          <Check size={30}/>
        ) : assetMenuOpen ? (
          <X size={34}/>
        ) : (
          <Plus size={34}/>
        )}
      </button>
    </div>
  );
}

function AccountGroup({ title, sub, accounts, updateBalance, readOnly, editingBalances=false, setEditor, setState }) {
  const editAccount = (account) => {
    setEditor?.({ type:"account", item:account, defaultKind:account.kind });
  };

  const deleteAccount = (account) => {
    if (!confirm(`Delete ${account.name}? This removes it from your account list and future live balances.`)) return;

    setState?.(s => {
      const nextAccounts = s.accounts.filter(a => a.id !== account.id);

      // Also remove from existing month snapshots so old reports stay consistent
      // with the user's explicit delete choice.
      const nextSnapshots = Object.fromEntries(
        Object.entries(s.monthSnapshots || {}).map(([key, snap]) => {
          const accounts = (snap.accounts || []).filter(a => a.id !== account.id);
          const assets = accounts.filter(a => a.kind === "asset").reduce((sum, a) => sum + Number(a.balance || 0), 0);
          const debts = accounts.filter(a => a.kind === "debt").reduce((sum, a) => sum + Number(a.balance || 0), 0);
          return [key, { ...snap, accounts, assets, debts, net:assets - debts, updatedAt:new Date().toISOString() }];
        })
      );

      return {
        ...s,
        accounts: nextAccounts,
        monthSnapshots: nextSnapshots
      };
    });
  };

  return (
    <Card className="account-group">
      <h2>{title}</h2>
      <p>{sub}</p>
      {accounts.map(a => {
        const delta = Number(a.balance || 0) - Number(a.previous || 0);
        return (
          <div className="account-row" key={a.id}>
            <div className={`round-icon ${a.kind === "debt" ? "debt" : "asset"}`}>{a.icon || (a.kind==="debt" ? "💳" : "💼")}</div>
            <div className="row-main">
              <strong>{a.name}</strong>
              <span>
                Prev: {money(a.previous)} {delta < 0 ? "↓" : delta > 0 ? "↑" : "—"} {money(Math.abs(delta))}
              </span>
            </div>

            <div className="account-actions-wrap">
              {readOnly ? (
                <div className="balance-display">{money(a.balance)}</div>
              ) : (
                <input value={a.balance} type="number" onChange={(e)=>updateBalance(a.id, e.target.value)} />
              )}

              {editingBalances && (
                <div className="account-row-actions">
                  <button onClick={()=>editAccount(a)} aria-label={`Edit ${a.name}`}><Pencil size={16}/></button>
                  <button className="delete" onClick={()=>deleteAccount(a)} aria-label={`Delete ${a.name}`}><Trash2 size={16}/></button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function HistoryPage({ state, setState, totals, metric, setHistoryMetric, setMenuOpen }) {
  const rows = historyRows(state);
  const current = state.monthSnapshots?.[state.selectedMonth] || { assets:totals.assets, debts:totals.debts, net:totals.net, accounts:state.accounts };
  const titleMap = { net:"Net Worth", assets:"Total Assets", debts:"Total Debts" };

  return (
    <div className="screen">
      <ScreenTitle title="History" sub="Month-by-month financial summary." setMenuOpen={setMenuOpen} back={()=>setHistoryMetric(null)} />
      <MonthBar state={state} setState={setState} thin />

      <Card className="center-card">
        <p>{titleMap[metric]}</p>
        <h2 className={metric === "debts" ? "danger" : "success"}>{metric === "debts" ? "-" : ""}{money(current[metric] || 0)}</h2>
        <p>{titleMap[metric]} for {monthLabel(state.selectedMonth)}</p>
      </Card>

      <DonutCard title="What I Own" kind="asset" accounts={(current.accounts || []).filter(a=>a.kind==="asset")} />
      <DonutCard title="What I Owe" kind="debt" accounts={(current.accounts || []).filter(a=>a.kind==="debt")} />

      <Card className="history-table">
        <div className="table-head"><span>Month</span><span>Assets</span><span>Debts</span><span>Net · MoM</span></div>
        {rows.length ? rows.map((r, i) => {
          const prev = rows[i+1];
          const mom = prev ? r.net - prev.net : 0;
          return (
            <div className="history-row" key={r.key} onClick={()=>setState(s=>({...s, selectedMonth:r.key}))}>
              <span>{shortMonthLabel(r.key)}</span>
              <span>{money(r.assets)}</span>
              <span className="danger">-{money(r.debts)}</span>
              <span>
                <b className={r.net >= 0 ? "success":"danger"}>{money(r.net)}</b>
                <em className={mom >= 0 ? "mom good":"mom bad"}>{signedMoney(mom)} MoM</em>
              </span>
            </div>
          );
        }) : <p className="muted">No saved monthly snapshots yet. Save a snapshot from Assets & Debts.</p>}
      </Card>
    </div>
  );
}

function DonutCard({ title, kind, accounts }) {
  const total = accounts.reduce((s,a)=>s+Number(a.balance||0),0);
  const colors = kind === "asset" ? ["#3fa463","#63b77c","#91cda3","#c0e2ca"] : ["#e5292f","#ea5358","#f07d82","#f6a6a9"];
  const data = accounts.map((a, i)=>({ name:a.name, value:Number(a.balance||0), color:colors[i%colors.length] })).filter(d=>d.value>0);

  return (
    <Card className="donut-card">
      <h2>{title}</h2>
      {data.length ? (
        <div className="donut-layout">
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={0}>
                  {data.map((d,i)=><Cell key={d.name} fill={d.color}/>)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center"><b className={kind==="debt"?"danger":""}>{kind==="debt" ? "-" : ""}{money(total)}</b><span>total</span></div>
          </div>
          <div className="donut-legend">
            {data.map(d=>(
              <div key={d.name}><i style={{background:d.color}}></i><span>{d.name}</span><b className={kind==="debt"?"danger":""}>{kind==="debt" ? "-" : ""}{money(d.value)}</b></div>
            ))}
          </div>
        </div>
      ) : <p className="muted">No {kind === "asset" ? "assets" : "debts"} in this snapshot.</p>}
    </Card>
  );
}

function CashFlow({ state, totals, setEditor, setMenuOpen }) {
  const next7 = upcomingTransactions(state.transactions, 7);
  const recurringIncome = recurringCashflowTransactions(state.transactions, "income");
  const recurringExpenses = recurringCashflowTransactions(state.transactions, "expense");

  return (
    <div className="screen">
      <ScreenTitle title="Cash Flow" sub="See what's coming in and what's going out." setMenuOpen={setMenuOpen} />
      <Card>
        <h2>Money In vs Out</h2>
        <div className="cash-totals">
          <div><span>Monthly Income</span><strong className="success">{money(totals.income)}</strong></div>
          <div><span>Monthly Expenses</span><strong className="danger">{money(totals.expenses)}</strong></div>
        </div>
        <div className="net-line"><span>Net</span><strong className={totals.income - totals.expenses >= 0 ? "success" : "danger"}>{money(totals.income - totals.expenses)}</strong></div>
      </Card>

      <Card>
        <div className="section-title"><h2>Next 7 Days <ChevronDown size={20}/></h2><b>{next7.length} upcoming</b></div>
        {next7.length ? next7.map(t => <TransactionRow key={t.id} t={t} setEditor={setEditor}/>) : <p className="muted">No upcoming transactions yet.</p>}
      </Card>

      <TransactionGroup title={`Recurring Income (${recurringIncome.length})`} total={totals.income} color="success" txns={recurringIncome} setEditor={setEditor}/>
      <TransactionGroup title={`Recurring Expenses (${recurringExpenses.length})`} total={totals.expenses} color="danger" txns={recurringExpenses} setEditor={setEditor}/>
      <button className="fab" onClick={()=>setEditor({ type:"transaction" })}><Plus size={34}/></button>
    </div>
  );
}

function TransactionGroup({ title, total, color, txns, setEditor }) {
  return (
    <Card>
      <h2>{title}</h2>
      <p className={color}>Total Monthly: {money(total)}</p>
      {txns.length ? txns.map(t => <TransactionRow key={t.id} t={t} setEditor={setEditor} controls />) : <p className="muted">None yet.</p>}
    </Card>
  );
}

function TransactionRow({ t, setEditor, controls=false }) {
  return (
    <div className="transaction-row">
      <div className={`round-icon ${t.type === "income" ? "asset" : "debt"}`}>{t.icon || (t.type==="income" ? "💵" : "💳")}</div>
      <div className="row-main">
        <strong>{t.name}</strong>
        <span>{formatDate(t.occurrenceDate || t.date)} · {relativeDate(t.occurrenceDate || t.date)} · {frequencyLabel(t.frequency || (t.recurring ? "monthly" : "oneOff"))}</span>
      </div>
      <strong className={t.type === "income" ? "success" : "danger"}>{t.type === "income" ? "+" : "-"}{money(t.amount)}</strong>
      {controls && <button className="icon-btn" onClick={()=>setEditor({ type:"transaction", item:t })}><Pencil size={20}/></button>}
    </div>
  );
}

function CompactTxn({ t }) {
  const d = new Date(t.occurrenceDate || t.displayDate || t.date);
  return (
    <div className="compact-txn">
      <strong>{d.toLocaleString("en-US", { weekday:"short", day:"numeric", month:"short" })}</strong>
      <span>{t.icon || "💳"}</span>
      <p>{t.name}</p>
      <b className={t.type === "income" ? "success" : "danger"}>{money(t.amount)} {t.type === "expense" ? "↓" : "↑"}</b>
    </div>
  );
}



function Goals({ state, setState, setEditor, setMenuOpen, setCompoundOpen, isDemo=false }) {
  const [goalMenuOpen, setGoalMenuOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [showArchivedGoals, setShowArchivedGoals] = useState(false);

  const totals = computeTotals(state);
  const accountsForMonth = getAccountsForSelectedMonth(state);

  const allGoals = state.goals || [];
  const activeGoals = allGoals.filter(g => !g.archived);
  const archivedGoals = allGoals.filter(g => g.archived);

  const toggle = (id) => setState(s => ({
    ...s,
    goals: (s.goals || []).map(g => g.id === id ? { ...g, open: !g.open } : g)
  }));

  const del = (id) => setState(s => ({
    ...s,
    goals: (s.goals || []).filter(g => g.id !== id)
  }));

  const archive = (id) => {
    if (isDemo) return readOnlyDemoAlert();
    setState(s => ({
      ...s,
      goals: (s.goals || []).map(g => g.id === id ? { ...g, archived: true, archivedAt: new Date().toISOString(), open: false } : g)
    }));
    setShowArchivedGoals(true);
  };

  const restore = (id) => {
    if (isDemo) return readOnlyDemoAlert();
    setState(s => ({
      ...s,
      goals: (s.goals || []).map(g => g.id === id ? { ...g, archived: false, restoredAt: new Date().toISOString() } : g)
    }));
  };

  const moveGoal = (id, direction) => {
    if (isDemo) return readOnlyDemoAlert();
    setState(s => {
      const activeIds = (s.goals || []).filter(g => !g.archived).map(g => g.id);
      const activeIndex = activeIds.indexOf(id);
      const nextActiveId = activeIds[activeIndex + direction];
      if (!nextActiveId) return s;
      const goals = [...(s.goals || [])];
      const index = goals.findIndex(g => g.id === id);
      const nextIndex = goals.findIndex(g => g.id === nextActiveId);
      if (index < 0 || nextIndex < 0) return s;
      [goals[index], goals[nextIndex]] = [goals[nextIndex], goals[index]];
      return { ...s, goals };
    });
  };

  const openAddGoal = () => {
    if (isDemo) return readOnlyDemoAlert();
    setGoalMenuOpen(false);
    setEditor({ type: "goal" });
  };

  const openCompound = () => {
    setGoalMenuOpen(false);
    setCompoundOpen(true);
  };

  return (
    <div className="screen">
      <ScreenTitle title="Your Goals" sub="Big dreams? Let's make them happen — one goal at a time." setMenuOpen={setMenuOpen} />

      {reorderMode && <div className="snapshot-banner">Reorder mode enabled · use ↑ ↓ on each goal</div>}

      <section className="goals-section active-goals-section">
        <div className="goals-section-label"><span></span><strong>Active Goals</strong></div>
        {activeGoals.length ? activeGoals.map((g, index) => (
          <GoalCard
            key={g.id}
            g={g}
            totals={totals}
            accounts={accountsForMonth}
            state={state}
            toggle={toggle}
            del={del}
            archive={archive}
            setEditor={setEditor}
            reorderMode={reorderMode}
            moveGoal={moveGoal}
            canMoveUp={index > 0}
            canMoveDown={index < activeGoals.length - 1}
          />
        )) : (
          <EmptyState title="No active goals" text="Add your next wealth goal or restore one from the archive." action="Add goal" onClick={openAddGoal}/>
        )}
      </section>

      <section className="archived-goals-wrap">
        <button className="archived-goals-toggle" type="button" onClick={() => setShowArchivedGoals(v => !v)}>
          <div>
            <strong>Archived Goals</strong>
            <span>{archivedGoals.length ? `${archivedGoals.length} completed & retired goal${archivedGoals.length === 1 ? "" : "s"}` : "No archived goals yet"}</span>
          </div>
          <b>{showArchivedGoals ? "−" : "+"}</b>
        </button>

        {showArchivedGoals && (
          <div className="archived-goals-list">
            {archivedGoals.length ? archivedGoals.map(g => {
              let calc = calculateGoalProgress(g, totals, accountsForMonth);
              calc = refineDebtPayoffCalcWithHistory(g, state, calc);
              const pct = Math.round(calc.progress || 0);
              return (
                <article key={g.id} className={`goal-card slim archived-goal-card ${g.color || goalColorForType(g.goalType)}`}>
                  <div className="goal-top compact">
                    <div className="goal-icon">{g.icon || goalIconForType(g.goalType)}</div>
                    <div className="row-main">
                      <h2>{g.name}</h2>
                      <span>{goalTypeLabel(g.goalType)} · archived</span>
                    </div>
                    <b>{pct}%</b>
                  </div>
                  <div className="archived-goal-meta">
                    <span>Archived</span>
                    <strong>{g.archivedAt ? new Date(g.archivedAt).toLocaleDateString() : "Saved"}</strong>
                  </div>
                  <div className="archived-goal-actions">
                    <button type="button" className="ghost" onClick={()=>restore(g.id)}>Restore from Cloud</button>
                    <button type="button" className="danger-mini" onClick={()=>del(g.id)}>Delete</button>
                  </div>
                </article>
              );
            }) : (
              <div className="empty-archive-note">Archive completed, paused, or retired goals here so your active list stays focused.</div>
            )}
          </div>
        )}
      </section>

      {goalMenuOpen && (
        <div className="goal-fab-menu">
          <button onClick={openAddGoal}><span className="menu-icon green">+</span><b>Add goal</b></button>
          <button onClick={()=>{ if (isDemo) return readOnlyDemoAlert(); setReorderMode(v=>!v); setGoalMenuOpen(false); }}><span className="menu-icon gray">↕</span><b>{reorderMode ? "Done reorder" : "Reorder goals"}</b></button>
          <button onClick={openCompound}><span className="menu-icon gray">%</span><b>Compound Wealth</b></button>
        </div>
      )}

      <button className={goalMenuOpen ? "fab edit-active" : "fab"} onClick={()=> isDemo ? readOnlyDemoAlert() : setGoalMenuOpen(v=>!v)} aria-label="Goal actions">
        {goalMenuOpen ? <X size={34}/> : <Plus size={34}/>}      
      </button>
    </div>
  );
}

function GoalCard({ g, totals, accounts, state, toggle, del, archive, setEditor, reorderMode, moveGoal, canMoveUp, canMoveDown }) {
  let calc = calculateGoalProgress(g, totals, accounts);
  calc = refineDebtPayoffCalcWithHistory(g, state, calc);
  const pct = Math.round(calc.progress);
  const status = goalStatus(calc, g);
  const forecast = estimateGoalCompletion(g, state, calc);

  return (
    <div className={`goal-card slim ${g.color || goalColorForType(g.goalType)} ${g.open ? "open":""}`}>
      <div className="goal-top compact" onClick={()=>!reorderMode && toggle(g.id)}>
        <div className="goal-icon">{g.icon || goalIconForType(g.goalType)}</div>
        <div className="row-main">
          <h2>{g.name}</h2>
          <span>{goalTypeLabel(g.goalType)} · {calc.sourceLabel}</span>
        </div>
        <b>{pct}%</b>
        {reorderMode ? (
          <div className="reorder-controls" onClick={(e)=>e.stopPropagation()}>
            <button disabled={!canMoveUp} onClick={()=>moveGoal(g.id, -1)}>↑</button>
            <button disabled={!canMoveDown} onClick={()=>moveGoal(g.id, 1)}>↓</button>
          </div>
        ) : (
          g.open ? <ChevronUp size={22}/> : <ChevronDown size={22}/>
        )}
      </div>
      {g.open && !reorderMode && (
        <div className="goal-details">
          <div className="progress-line">
            <span>
              {(calc.goalType || g.goalType) === "debtPayoff"
                ? `${money(Math.max(0, Number(calc.start || 0) - Number(calc.current || 0)))} / ${money(calc.start)} paid`
                : `${money(calc.current)} / ${money(calc.target)}`}
            </span>
            <b>{pct}%</b>
          </div>
          <div className="bar"><i style={{width:`${pct}%`}}></i></div>
          <dl>
            <dt>Goal type</dt><dd>{goalTypeLabel(g.goalType)}</dd>
            <dt>Target</dt><dd>{money(calc.target)}</dd>
            <dt>Current</dt><dd>{money(calc.current)}</dd>
            <dt>Remaining</dt><dd>{money(calc.remaining)}</dd>
            <dt>Deadline</dt><dd>{g.deadline ? new Date(g.deadline).toLocaleDateString("en-US", {month:"short", year:"numeric"}) : "—"}</dd>
          </dl>

          <div className={`pace-card ${status.kind}`}>
            <h3>{status.icon} {status.label}</h3>
            <span>{status.detail}</span>
            <p>{calc.monthlyNeeded > 0 ? `Required: ${money(calc.monthlyNeeded)}/mo until deadline` : "No monthly pace required."}</p>

            <div className={`forecast-pill ${forecast.kind}`}>
              <strong>Forecast finish</strong>
              <b>{forecast.label}</b>
              <small>{forecast.detail}</small>
            </div>
          </div>

          <div className="goal-actions">
            <button onClick={()=>setEditor({ type:"goal", item:g })}><Pencil size={20}/>Edit</button>
            <button className="archive" onClick={()=>archive(g.id)}><Archive size={20}/>Archive</button>
            <button className="delete" onClick={()=>del(g.id)}><Trash2 size={20}/>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompoundWealthPage({ setCompoundOpen, setMenuOpen }) {
  const [inputs, setInputs] = useState({
    start: 20000,
    monthly: 2100,
    years: 16,
    rate: 10,
    startYear: new Date().getFullYear(),
    age: 35
  });

  const change = (key, value) => setInputs(s => ({ ...s, [key]: Number(value || 0) }));

  const rows = useMemo(() => {
    let value = Number(inputs.start || 0);
    const annualContribution = Number(inputs.monthly || 0) * 12;
    const rate = Number(inputs.rate || 0) / 100;
    const out = [];

    for (let i = 0; i <= Number(inputs.years || 0); i++) {
      const year = Number(inputs.startYear || new Date().getFullYear()) + i;
      const age = Number(inputs.age || 0) + i;
      const contribution = annualContribution * (i + 1);
      const beforeGrowth = value + annualContribution;
      const growth = beforeGrowth * rate;
      value = beforeGrowth + growth;

      out.push({
        year,
        age,
        contribution,
        growth,
        value
      });
    }

    return out;
  }, [inputs]);

  const futureValue = rows.at(-1)?.value || Number(inputs.start || 0);
  const totalContributions = Number(inputs.start || 0) + (Number(inputs.monthly || 0) * 12 * Number(inputs.years || 0));
  const totalGrowth = Math.max(0, futureValue - totalContributions);

  const reset = () => setInputs({ start:20000, monthly:2100, years:16, rate:10, startYear:new Date().getFullYear(), age:35 });

  return (
    <div className="screen compound-screen">
      <section className="compound-header">
        <button className="round-nav-btn" onClick={()=>setCompoundOpen(false)}><ArrowLeft size={24}/></button>
        <div>
          <h1>Compound Wealth</h1>
          <p>Run your rich-life scenarios and see how time turns habits into wealth.</p>
        </div>
        <button className="reset-btn" onClick={reset}>Reset</button>
      </section>

      <Card>
        <span className="section-chip">Scenario inputs</span>
        <div className="compound-grid">
          <label>Starting amount ($)<input type="number" value={inputs.start} onChange={e=>change("start", e.target.value)} /></label>
          <label>Monthly contribution ($)<input type="number" value={inputs.monthly} onChange={e=>change("monthly", e.target.value)} /></label>
          <label>Years<input type="number" value={inputs.years} onChange={e=>change("years", e.target.value)} /></label>
          <label>Annual rate (%)<input type="number" value={inputs.rate} onChange={e=>change("rate", e.target.value)} /></label>
          <label>Start year (calendar)<input type="number" value={inputs.startYear} onChange={e=>change("startYear", e.target.value)} /></label>
          <label>Your age at start year<input type="number" value={inputs.age} onChange={e=>change("age", e.target.value)} /></label>
        </div>
      </Card>

      <div className="future-value"><span>Future value</span><b>{money(futureValue)}</b></div>
      <div className="simple-row"><span>Your total contributions</span><b>{money(totalContributions)}</b></div>
      <div className="simple-row"><span>Total growth</span><b>{money(totalGrowth)}</b></div>

      <div className="checkpoint-label"><i></i><b>Yearly checkpoints</b></div>

      <Card className="checkpoint-card">
        <h2>Yearly Checkpoints</h2>
        <div className="checkpoint-head"><span>Year</span><span>Age</span><span>Contr.</span><span>Growth</span><span>Value</span></div>
        {rows.map(row => (
          <div className="checkpoint-row" key={row.year}>
            <span>{row.year}</span>
            <span>{row.age}</span>
            <span>{compactMoney(row.contribution)}</span>
            <span className="success">+{compactMoney(row.growth)}</span>
            <span>{compactMoney(row.value)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function compactMoney(value) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 10000) return `$${Math.round(n).toLocaleString("en-US")}`;
  if (Math.abs(n) >= 1000) return `$${(n/1000).toFixed(1)}k`;
  return money(n);
}


function Settings({ state, update, saveSnapshot, restoreSnapshot, setMenuOpen, session, displayName, signOut, isDemo=false, enterDemoMode, exitDemoMode, dashboardStyle="minimal", setDashboardStyle}) {
  return (
    <div className="screen">
      <ScreenTitle title="Settings" sub="Manage your account, theme, local data, and Supabase snapshots." setMenuOpen={setMenuOpen} />

      <Card>
        <h2>Account</h2>
        <p>Signed in as</p>
        <strong className="account-name">{displayName || "there"}</strong>
        <strong className="account-email">{session?.user?.email || "Unknown user"}</strong>
        <div className="button-row">
          <button className="danger-btn" onClick={signOut}>Sign out</button>
        </div>
      </Card>

      <Card>
        <h2>Demo Mode</h2>
        <p>{isDemo ? "You are viewing read-only sample data. Save, restore, edit, add, and delete actions are disabled." : "Try Grow UP with read-only sample data."}</p>
        <button className={isDemo ? "danger-btn" : "secondary"} onClick={isDemo ? exitDemoMode : enterDemoMode}>
          {isDemo ? "Exit Demo Mode" : "Enter Demo Mode"}
        </button>
      </Card>
      <Card>
        <h2>Email Reminders</h2>
        <p>Send reliable email reminders for recurring transactions, monthly balance updates, goal deadlines, and milestone moments.</p>

        <div className="email-reminder-card">
          <div className="email-reminder-main">
            <div>
              <strong>{state.emailRemindersEnabled ? "Email reminders enabled" : "Email reminders off"}</strong>
              <span>{session?.user?.email || "Sign in to enable email reminders"}</span>
            </div>

            <button
              type="button"
              className={state.emailRemindersEnabled ? "secondary" : "primary"}
              onClick={async()=>{
                const nextEnabled = !state.emailRemindersEnabled;
                const saved = await saveEmailReminderPreferences({
                  session,
                  state,
                  update,
                  overrides: { emailRemindersEnabled: nextEnabled }
                });
                if (saved && nextEnabled) alert("Email reminders are now enabled.");
              }}
            >
              {state.emailRemindersEnabled ? "Turn off" : "Enable"}
            </button>
          </div>

          <div className="email-reminder-grid">
            <label>
              <span>Transaction reminder</span>
              <select
                value={state.emailReminderDays ?? 1}
                onChange={async e=>{
                  await saveEmailReminderPreferences({
                    session,
                    state,
                    update,
                    overrides: { emailRemindersEnabled: true, emailReminderDays: Number(e.target.value) }
                  });
                }}
              >
                <option value={0}>Due day</option>
                <option value={1}>1 day before</option>
                <option value={2}>2 days before</option>
                <option value={7}>1 week before</option>
              </select>
            </label>

            <label>
              <span>Monthly balance day</span>
              <select
                value={state.monthlyBalanceReminderDay ?? 28}
                onChange={async e=>{
                  await saveEmailReminderPreferences({
                    session,
                    state,
                    update,
                    overrides: { emailRemindersEnabled: true, monthlyBalanceReminderDay: Number(e.target.value) }
                  });
                }}
              >
                <option value={25}>25th</option>
                <option value={28}>28th</option>
                <option value={30}>30th</option>
                <option value={31}>Last day</option>
              </select>
            </label>
          </div>

          <div className="email-reminder-toggles">
            <button
              type="button"
              className={state.emailGoalReminders ? "active" : ""}
              onClick={async()=> {
                await saveEmailReminderPreferences({
                  session,
                  state,
                  update,
                  overrides: { emailRemindersEnabled: true, emailGoalReminders: !state.emailGoalReminders }
                });
              }}
            >
              <span>{state.emailGoalReminders ? "✓" : "○"}</span>
              Goal reminders
            </button>

            <button
              type="button"
              className={state.emailMilestoneEmails ? "active" : ""}
              onClick={async()=> {
                await saveEmailReminderPreferences({
                  session,
                  state,
                  update,
                  overrides: { emailRemindersEnabled: true, emailMilestoneEmails: !state.emailMilestoneEmails }
                });
              }}
            >
              <span>{state.emailMilestoneEmails ? "✓" : "○"}</span>
              Milestone emails
            </button>
          </div>
        </div>
      </Card>


      <Card>
        <h2>Dashboard Style</h2>
        <p>Choose your Overview layout. Minimal is the default, Detailed keeps the full dashboard.</p>
        <div className="dashboard-style-toggle">
          <button
            type="button"
            className={dashboardStyle === "minimal" ? "active" : ""}
            onClick={()=>setDashboardStyle("minimal")}
          >
            Minimal
          </button>
          <button
            type="button"
            className={dashboardStyle === "detailed" ? "active" : ""}
            onClick={()=>setDashboardStyle("detailed")}
          >
            Detailed
          </button>
        </div>
      </Card>

      <Card>
        <h2>Appearance</h2>
        <p>Theme: {state.theme}</p>
        <button className="primary" onClick={()=>update({ theme:state.theme === "light" ? "dark" : "light" })}>{state.theme === "light" ? <Moon size={18}/> : <Sun size={18}/>} Toggle theme</button>
      </Card>

      <Card>
        <h2>Backup & Restore</h2>
        <p>Keep a secure cloud backup of your Grow UP data and restore your latest saved version when needed.</p>
        <div className="button-row">
          <button className="primary" disabled={isDemo} onClick={saveSnapshot}><Save size={18}/> Back up data</button>
          <button className="secondary" disabled={isDemo} onClick={restoreSnapshot}><DownloadCloud size={18}/> Restore from Cloud</button>
        </div>
      </Card>

      <Card>
        <h2>Legal</h2>
        <div className="legal-link-row">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </div>
      </Card>

      <Card>
        <h2>Danger zone</h2>
        <button className="danger-btn" disabled={isDemo} onClick={()=>{ if(confirm("Reset local data?")) { localStorage.removeItem(STORAGE_KEY); location.reload(); }}}><RotateCcw size={18}/> Reset local data</button>
      </Card>
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    ["overview", Home, "Overview"],
    ["assets", CreditCard, "Assets & De..."],
    ["cash", Repeat2, "Cash Flow"],
    ["goals", Target, "Wealth Goals"],
  ];
  return (
    <nav className="bottom-nav">
      {items.map(([id, Icon, label]) => (
        <button key={id} className={tab === id ? "active" : ""} onClick={()=>setTab(id)}>
          <Icon size={26}/><span>{label}</span>
        </button>
      ))}
    </nav>
  );
}


function MenuSheet({ state, setMenuOpen, setTab, update, saveSnapshot, restoreSnapshot, session, displayName, signOut, isDemo=false, enterDemoMode, exitDemoMode, setTimelineOpen, setInsightsOpen}) {
  return (
    <div className="sheet-backdrop" onClick={()=>setMenuOpen(false)}>
      <div className="menu-sheet app-drawer" onClick={(e)=>e.stopPropagation()}>
        <div className="sheet-head"><div className="app-icon drawer-logo"><img src="/icons/growup-logo.png" alt="Grow UP" /></div><div><h2>{displayName || "Grow UP"}</h2><p>{session?.user?.email || "Personal finance PWA"}</p></div><button onClick={()=>setMenuOpen(false)}><X/></button></div>
        <button onClick={()=>{setTab("overview");setMenuOpen(false)}}><Home/> Overview</button>
        <button onClick={()=>{setTab("assets");setMenuOpen(false)}}><CreditCard/> Assets & Debts</button>
        <button onClick={()=>{setTab("cash");setMenuOpen(false)}}><Repeat2/> Cash Flow</button>
        <button onClick={()=>{setTab("goals");setMenuOpen(false)}}><Target/> Wealth Goals</button>
        <button onClick={isDemo ? exitDemoMode : enterDemoMode}><SlidersHorizontal/> {isDemo ? "Exit Demo Mode" : "Enter Demo Mode"}</button>
        <hr/>
        <button onClick={()=>update({ theme:state.theme === "light" ? "dark" : "light" })}>{state.theme === "light" ? <Moon/> : <Sun/>} Toggle theme</button>
        <button disabled={isDemo} onClick={saveSnapshot}><Save/> Back up data</button>
        <button disabled={isDemo} onClick={restoreSnapshot}><DownloadCloud/> Restore from Cloud</button>
        <button onClick={()=>{setTab("settings");setMenuOpen(false)}}><SlidersHorizontal/> Settings</button>
        <button onClick={()=>{ window.location.href = "/privacy"; }}><SlidersHorizontal/> Privacy Policy</button>
        <button onClick={()=>{ window.location.href = "/terms"; }}><SlidersHorizontal/> Terms</button>
        {session && !isDemo && <button className="menu-danger" onClick={signOut}><X/> Sign out</button>}
      </div>
    </div>
  );
}

function EditorModal({ editor, setEditor, state, setState }) {
  const item = editor.item || {};
  const [form, setForm] = useState({
    name:item.name || "",
    icon:item.icon || "",
    kind:item.kind || editor.defaultKind || "asset",
    balance:item.balance || "",
    previous:item.previous || "",
    type:item.type || "expense",
    amount:item.amount || "",
    category:item.category || "",
    date:item.date ? item.date.slice(0,10) : new Date().toISOString().slice(0,10),
    recurring:item.recurring || false,
    frequency:item.frequency || (item.recurring ? "monthly" : "oneOff"),
    goalType:item.goalType || "netWorth",
    accountId:item.accountId || "",
    account:item.account || "",
    current:item.current || "",
    start:item.start || item.startAmount || "",
    target:item.target ?? "",
    deadline:item.deadline || "",
    color:item.color || "green"
  });

  const change = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const save = () => {
    if (editor.type === "account") {
      const acct = {
        id:item.id || safeId(),
        name:form.name || "Account",
        icon:form.icon || (form.kind === "debt" ? "💳" : "💼"),
        kind:form.kind,
        balance:Number(form.balance || 0),
        previous:Number(form.previous || 0)
      };
      setState(s => ({ ...s, accounts:item.id ? s.accounts.map(a => a.id === item.id ? acct : a) : [...s.accounts, acct] }));
    }

    if (editor.type === "transaction") {
      const frequency = form.frequency || "oneOff";
      const tx = {
        id:item.id || safeId(),
        type:form.type,
        name:form.name || "Transaction",
        icon:form.icon || (form.type === "income" ? "💵" : "💳"),
        amount:Number(form.amount || 0),
        category:form.category,
        date:new Date(form.date).toISOString(),
        frequency,
        recurring:frequency !== "oneOff"
      };
      setState(s => ({ ...s, transactions:item.id ? s.transactions.map(t => t.id === item.id ? tx : t) : [...s.transactions, tx] }));
    }

    if (editor.type === "goal") {
      const linkedAccount = state.accounts.find(a => a.id === form.accountId);
      const goal = {
        id:item.id || safeId(),
        name:form.name || "Goal",
        icon:form.icon || goalIconForType(form.goalType),
        goalType:form.goalType,
        accountId:form.accountId || "",
        account:linkedAccount?.name || form.account || (form.goalType === "netWorth" ? "Net Worth" : "Manual"),
        color:form.color || goalColorForType(form.goalType),
        current:Number(form.current || 0),
        start:Number(form.start || 0),
        target:Number(form.target || 0),
        deadline:form.deadline,
        open:item.open ?? true
      };
      setState(s => ({ ...s, goals:item.id ? s.activeGoals.map(g => g.id === item.id ? goal : g) : [...s.goals, goal] }));
    }

    setEditor(null);
  };

  return (
    <div className="modal-backdrop">
      <div className="editor-modal">
        <div className="modal-head"><h2>{item.id ? "Edit" : "Add"} {editor.type}</h2><button onClick={()=>setEditor(null)}><X/></button></div>
        <label>Name<input value={form.name} onChange={e=>change("name", e.target.value)} /></label>
        <label>Icon / Emoji<input value={form.icon} onChange={e=>change("icon", e.target.value)} /></label>

        {editor.type === "account" && <>
          <label>Kind<select value={form.kind} onChange={e=>change("kind", e.target.value)}><option value="asset">Asset</option><option value="debt">Debt</option></select></label>
          <label>Current balance<input type="number" value={form.balance} onChange={e=>change("balance", e.target.value)} /></label>
          <label>Previous balance<input type="number" value={form.previous} onChange={e=>change("previous", e.target.value)} /></label>
        </>}

        {editor.type === "transaction" && <>
          <label>Type<select value={form.type} onChange={e=>change("type", e.target.value)}><option value="income">Income</option><option value="expense">Expense</option></select></label>
          <label>Amount<input type="number" value={form.amount} onChange={e=>change("amount", e.target.value)} /></label>
          <label>Category<input value={form.category} onChange={e=>change("category", e.target.value)} /></label>
          <label>Start / Next Date<input type="date" value={form.date} onChange={e=>change("date", e.target.value)} /></label>
          <label>Frequency
            <select value={form.frequency} onChange={e=>{
              change("frequency", e.target.value);
              change("recurring", e.target.value !== "oneOff");
            }}>
              <option value="oneOff">One-off</option>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
        </>}

        {editor.type === "goal" && <>
          <label>Goal Type
            <select value={form.goalType} onChange={e=>change("goalType", e.target.value)}>
              <option value="netWorth">Net Worth Goal</option>
              <option value="accountGrowth">Account Growth Goal</option>
              <option value="debtPayoff">Debt Payoff Goal</option>
            </select>
          </label>

          {form.goalType === "netWorth" ? (
            <label>Metric<input value="Net Worth" disabled /></label>
          ) : (
            <label>Linked Account
              <select value={form.accountId} onChange={e=>change("accountId", e.target.value)}>
                <option value="">Manual / No linked account</option>
                {state.accounts
                  .filter(a => form.goalType === "debtPayoff" ? a.kind === "debt" : a.kind === "asset")
                  .map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          )}

          {form.goalType === "debtPayoff" ? (
            <>
              <label>Starting Debt<input type="number" value={form.start} onChange={e=>change("start", e.target.value)} placeholder="Original debt amount" /></label>
              <label>Current Debt Override<input type="number" value={form.current} onChange={e=>change("current", e.target.value)} placeholder="Only used if no account linked" /></label>
            </>
          ) : (
            <>
              <label>Current Override<input type="number" value={form.current} onChange={e=>change("current", e.target.value)} placeholder="Only used if no account linked" /></label>
              <label>Target<input type="number" value={form.target} onChange={e=>change("target", e.target.value)} /></label>
            </>
          )}

          <label>Deadline<input type="date" value={form.deadline} onChange={e=>change("deadline", e.target.value)} /></label>
          <label>Color<select value={form.color} onChange={e=>change("color", e.target.value)}><option value="green">Green</option><option value="purple">Purple</option><option value="red">Red</option></select></label>
        </>}

        <button className="primary full" onClick={save}>Save</button>
      </div>
    </div>
  );
}

function Card({ children, className="", onClick }) {
  return <section className={`card ${className}`} onClick={onClick}>{children}</section>;
}

function goalPct(g) {
  // Backward-compatible fallback for simple/manual goals.
  if (!g.target) return 0;
  return Math.max(0, Math.min(100, Number(g.current || 0) / Number(g.target || 1) * 100));
}

function getAccountsForSelectedMonth(state) {
  const snap = state.monthSnapshots?.[state.selectedMonth];
  return snap?.accounts || state.accounts || [];
}

function findAccount(accounts, goal) {
  if (!goal.accountId && !goal.account) return null;
  return accounts.find(a => a.id === goal.accountId || a.name === goal.account) || null;
}

function calculateGoalProgress(goal, totals, accounts) {
  const goalType = goal.goalType || inferGoalType(goal, accounts);
  const target = Number(goal.target || 0);
  const start = Number(goal.start || goal.startAmount || 0);
  const linkedAccount = findGoalAccountInSnapshot(accounts, goal);

  let current = Number(goal.current || 0);
  let sourceLabel = goal.account || "Manual";

  if (goalType === "netWorth") {
    current = Number(totals.net || 0);
    sourceLabel = "Net Worth";
  }

  if (goalType === "accountGrowth") {
    current = linkedAccount ? Number(linkedAccount.balance || 0) : Number(goal.current || 0);
    sourceLabel = linkedAccount?.name || goal.account || "Manual account";
  }

  if (goalType === "debtPayoff") {
    current = linkedAccount ? Number(linkedAccount.balance || 0) : Number(goal.current || 0);
    sourceLabel = linkedAccount?.name || goal.account || "Manual debt";

    // Debt payoff target is always zero debt.
    // If no starting debt was stored, use the largest known debt value from current/start fields.
    // Historical snapshot forecasting can refine this further in GoalCard.
    const originalDebt = Math.max(
      Number(start || 0),
      Number(goal.originalDebt || 0),
      Number(goal.target || 0),
      Number(current || 0)
    );

    const paidOff = Math.max(0, originalDebt - current);
    const progress = originalDebt > 0 ? clamp((paidOff / originalDebt) * 100) : 0;
    const remaining = Math.max(0, current);

    return {
      goalType,
      current,
      target: 0,
      start: originalDebt,
      progress,
      remaining,
      sourceLabel,
      monthlyNeeded: monthlyNeeded(remaining, goal.deadline)
    };
  }

  const progress = target > 0 ? clamp((current / target) * 100) : 0;
  const remaining = Math.max(0, target - current);

  return {
    goalType,
    current,
    target,
    start,
    progress,
    remaining,
    sourceLabel,
    monthlyNeeded: monthlyNeeded(remaining, goal.deadline)
  };
}

function inferGoalType(goal, accounts) {
  if (goal.account === "Net Worth" || goal.account === "NET_WORTH") return "netWorth";
  const linked = findAccount(accounts, goal);
  if (linked?.kind === "debt" || Number(goal.target || 0) === 0) return "debtPayoff";
  return "accountGrowth";
}

function clamp(n) {
  return Math.max(0, Math.min(100, Number(n || 0)));
}

function monthlyNeeded(remaining, deadline) {
  if (!deadline || remaining <= 0) return 0;
  const now = new Date();
  const end = new Date(deadline);
  if (end <= now) return remaining;
  const months = Math.max(1, ((end.getFullYear() - now.getFullYear()) * 12) + (end.getMonth() - now.getMonth()));
  return Math.ceil(remaining / months);
}



function normalizeAccountName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function accountNameAliases(name) {
  const normalized = normalizeAccountName(name);
  const aliases = new Set([normalized]);

  const map = {
    "personal loan": ["loan", "debt loan"],
    "credit card balance": ["credit card", "income tax debt", "tax debt"],
    "income tax debt": ["credit card balance", "tax debt"],
    "retirement fund": ["hesta super", "super", "retirement"],
    "investment portfolio": ["fire", "stocks", "investments"],
    "vehicle savings": ["tesla model 3", "car", "vehicle"],
    "emergency fund": ["lgds", "business asset", "cash reserve"]
  };

  Object.entries(map).forEach(([key, values]) => {
    if (normalized === key || values.includes(normalized)) {
      aliases.add(key);
      values.forEach(v => aliases.add(v));
    }
  });

  return aliases;
}

function findGoalAccountInSnapshot(accounts, goal) {
  if (!accounts?.length) return null;

  if (goal.accountId) {
    const byId = accounts.find(a => a.id === goal.accountId);
    if (byId) return byId;
  }

  const aliases = accountNameAliases(goal.account);
  return accounts.find(a => aliases.has(normalizeAccountName(a.name))) || null;
}

function goalValueForSnapshot(goal, snapshot) {
  const accounts = snapshot?.accounts || [];
  const totals = {
    assets: Number(snapshot?.assets || 0),
    debts: Number(snapshot?.debts || 0),
    net: Number(snapshot?.net || 0)
  };

  const goalType = goal.goalType || inferGoalType(goal, accounts);

  if (goalType === "netWorth") return totals.net;

  const account = findGoalAccountInSnapshot(accounts, goal);
  if (!account) return null;

  return Number(account.balance || 0);
}

function estimateGoalCompletion(goal, state, currentCalc) {
  const rows = historyRows(state)
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(row => {
      const snapshot = state.monthSnapshots?.[row.key];
      return {
        key: row.key,
        value: goalValueForSnapshot(goal, snapshot)
      };
    })
    .filter(row => row.value !== null && Number.isFinite(row.value));

  if (rows.length < 2) {
    return {
      label: "Need more history",
      detail: "Save at least 2 monthly snapshots for a forecast.",
      monthlyRate: 0,
      kind: "neutral"
    };
  }

  // Use up to 12 historical points for a more stable estimate.
  // This fixes debt payoff goals where the last few months may be flat
  // but the broader trend clearly shows debt reduction.
  const recent = rows.slice(-12);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const monthSpan = Math.max(1, monthDistance(first.key, last.key));
  const goalType = currentCalc.goalType || goal.goalType;

  let monthlyRate = 0;
  let remaining = Number(currentCalc.remaining || 0);

  if (goalType === "debtPayoff") {
    // Debt payoff improves when debt balance drops.
    monthlyRate = (Number(first.value || 0) - Number(last.value || 0)) / monthSpan;

    // If broad trend is flat, try the strongest older-to-current drop.
    if (monthlyRate <= 0) {
      const bestOlder = recent
        .slice(0, -1)
        .map(row => ({ ...row, drop: Number(row.value || 0) - Number(last.value || 0) }))
        .sort((a, b) => b.drop - a.drop)[0];

      if (bestOlder?.drop > 0) {
        monthlyRate = bestOlder.drop / Math.max(1, monthDistance(bestOlder.key, last.key));
      }
    }

    remaining = Number(currentCalc.remaining || 0);
  } else {
    monthlyRate = (Number(last.value || 0) - Number(first.value || 0)) / monthSpan;

    if (monthlyRate <= 0) {
      const bestOlder = recent
        .slice(0, -1)
        .map(row => ({ ...row, gain: Number(last.value || 0) - Number(row.value || 0) }))
        .sort((a, b) => b.gain - a.gain)[0];

      if (bestOlder?.gain > 0) {
        monthlyRate = bestOlder.gain / Math.max(1, monthDistance(bestOlder.key, last.key));
      }
    }

    remaining = Number(currentCalc.remaining || 0);
  }

  if (currentCalc.progress >= 100 || remaining <= 0) {
    return {
      label: "Already complete",
      detail: "Goal has been reached.",
      monthlyRate,
      kind: "complete"
    };
  }

  if (monthlyRate <= 0) {
    return {
      label: "No clear ETA",
      detail: "Past data is flat or moving away from the goal.",
      monthlyRate,
      kind: "warning"
    };
  }

  const monthsToFinish = Math.ceil(remaining / monthlyRate);
  const completionKey = addMonths(state.selectedMonth || currentMonthKey(), monthsToFinish);

  return {
    label: monthLabel(completionKey),
    detail: `Based on recent pace of ${money(monthlyRate)}/mo.`,
    monthlyRate,
    monthsToFinish,
    kind: "active"
  };
}

function monthDistance(startKey, endKey) {
  const [sy, sm] = startKey.split("-").map(Number);
  const [ey, em] = endKey.split("-").map(Number);
  return ((ey - sy) * 12) + (em - sm);
}


function refineDebtPayoffCalcWithHistory(goal, state, calc) {
  if ((calc.goalType || goal.goalType) !== "debtPayoff") return calc;

  const historicalValues = historyRows(state)
    .map(row => goalValueForSnapshot(goal, state.monthSnapshots?.[row.key]))
    .filter(value => value !== null && Number.isFinite(value))
    .map(Number);

  if (!historicalValues.length) return calc;

  const historicalStart = Math.max(...historicalValues, Number(calc.start || 0), Number(calc.current || 0));
  const current = Number(calc.current || historicalValues.at(-1) || 0);
  const paidOff = Math.max(0, historicalStart - current);
  const progress = historicalStart > 0 ? clamp((paidOff / historicalStart) * 100) : 0;

  return {
    ...calc,
    start: historicalStart,
    progress,
    remaining: Math.max(0, current),
    monthlyNeeded: monthlyNeeded(Math.max(0, current), goal.deadline)
  };
}

function goalStatus(calc, goal) {
  if (calc.progress >= 100) {
    return { kind:"complete", icon:"🎉", label:"Complete", detail:"Goal reached" };
  }

  if (!goal.deadline) {
    return { kind:"active", icon:"🎯", label:"Active", detail:"No deadline set" };
  }

  const need = calc.monthlyNeeded;
  if (need <= 0) {
    return { kind:"active", icon:"🎯", label:"Active", detail:"On track" };
  }

  return { kind:"active", icon:"📈", label:"In Progress", detail:`${Math.round(calc.progress)}% complete` };
}

function goalTypeLabel(type) {
  return {
    netWorth: "Net Worth Goal",
    accountGrowth: "Account Growth Goal",
    debtPayoff: "Debt Payoff Goal"
  }[type || "accountGrowth"] || "Goal";
}

function goalIconForType(type) {
  return {
    netWorth: "🎯",
    accountGrowth: "💼",
    debtPayoff: "⚡"
  }[type || "accountGrowth"] || "🎯";
}

function goalColorForType(type) {
  return {
    netWorth: "purple",
    accountGrowth: "green",
    debtPayoff: "red"
  }[type || "accountGrowth"] || "green";
}

function normalizeFrequency(frequency) {
  if (!frequency || frequency === "once") return "oneOff";
  return frequency;
}

function monthlyEquivalent(transaction) {
  const amount = Number(transaction.amount || 0);
  const frequency = normalizeFrequency(transaction.frequency || (transaction.recurring ? "monthly" : "oneOff"));

  switch (frequency) {
    case "weekly":
      return amount * 52 / 12;
    case "fortnightly":
      return amount * 26 / 12;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    case "oneOff":
    default:
      return 0;
  }
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonthsClamped(date, months) {
  const original = new Date(date);
  const targetMonth = original.getMonth() + months;
  const target = new Date(original);
  target.setDate(1);
  target.setMonth(targetMonth);
  target.setDate(Math.min(original.getDate(), daysInMonth(target.getFullYear(), target.getMonth())));
  return target;
}

function addFrequency(date, frequency) {
  const d = new Date(date);
  const normalizedFrequency = normalizeFrequency(frequency);

  switch (normalizedFrequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "fortnightly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      return addMonthsClamped(d, 1);
    case "quarterly":
      return addMonthsClamped(d, 3);
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      return d;
  }

  return d;
}

function getNextOccurrence(transaction, from = new Date()) {
  if (!transaction?.date) return null;

  const frequency = normalizeFrequency(transaction.frequency || (transaction.recurring ? "monthly" : "oneOff"));
  let occurrenceDate = new Date(transaction.date);
  if (Number.isNaN(occurrenceDate.getTime())) return null;

  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  if (frequency === "oneOff" || !transaction.recurring) {
    return occurrenceDate >= start ? occurrenceDate : null;
  }

  let safety = 0;
  while (occurrenceDate < start && safety < 500) {
    occurrenceDate = addFrequency(occurrenceDate, frequency);
    safety += 1;
  }

  return occurrenceDate;
}

function withNextOccurrence(transaction) {
  const occurrenceDate = getNextOccurrence(transaction);
  return occurrenceDate ? { ...transaction, occurrenceDate: occurrenceDate.toISOString(), displayDate: occurrenceDate.toISOString() } : transaction;
}

function recurringCashflowTransactions(transactions, type) {
  return (transactions || [])
    .filter(t => t.recurring && t.type === type && normalizeFrequency(t.frequency) !== "oneOff")
    .map(withNextOccurrence)
    .sort((a, b) => new Date(a.occurrenceDate || a.date) - new Date(b.occurrenceDate || b.date));
}

function upcomingTransactions(transactions, days) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const out = [];

  for (const transaction of transactions) {
    const frequency = normalizeFrequency(transaction.frequency || (transaction.recurring ? "monthly" : "oneOff"));
    let occurrenceDate = new Date(transaction.date);

    if (frequency === "oneOff" || !transaction.recurring) {
      if (occurrenceDate >= start && occurrenceDate <= end) {
        out.push({ ...transaction, occurrenceDate: occurrenceDate.toISOString() });
      }
      continue;
    }

    // Advance recurring item until it reaches the current window.
    let safety = 0;
    while (occurrenceDate < start && safety < 500) {
      occurrenceDate = addFrequency(occurrenceDate, frequency);
      safety += 1;
    }

    // Include all occurrences inside the selected window.
    while (occurrenceDate <= end && safety < 600) {
      out.push({
        ...transaction,
        occurrenceDate: occurrenceDate.toISOString(),
        displayDate: occurrenceDate.toISOString()
      });
      occurrenceDate = addFrequency(occurrenceDate, frequency);
      safety += 1;
    }
  }

  return out.sort((a,b)=>new Date(a.occurrenceDate || a.date)-new Date(b.occurrenceDate || b.date));
}

function historyRows(state) {
  return Object.entries(state.monthSnapshots || {})
    .map(([key, snap]) => ({ key, assets:Number(snap.assets||0), debts:Number(snap.debts||0), net:Number(snap.net||0), accounts:snap.accounts||[] }))
    .sort((a,b)=>b.key.localeCompare(a.key));
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

function relativeDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((d - start) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `in ${diff} days`;
}

function frequencyLabel(frequency) {
  return {
    oneOff: "one-off",
    weekly: "weekly",
    fortnightly: "fortnightly",
    monthly: "monthly",
    quarterly: "quarterly",
    yearly: "yearly"
  }[frequency || "monthly"] || "monthly";
}

function signedMoney(n) {
  const v = Number(n || 0);
  return `${v >= 0 ? "+" : "-"}${money(Math.abs(v))}`;
}

createRoot(document.getElementById("root")).render(<App />);
