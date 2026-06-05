import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { SUPPORT_EMAIL } from "../config";

export function LegalPage({ type }) {
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

export function PrivacyPolicyContent() {
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
      <p>We retain user data while accounts remain active or as reasonably necessary to provide the service. Users may request deletion of their account and associated data by contacting {SUPPORT_EMAIL}.</p>

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
      <p>For questions, support requests, or data deletion requests, contact Gilbert Ogbara at {SUPPORT_EMAIL}.</p>
    </article>
  );
}

export function TermsContent() {
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
      <p>We may suspend or terminate access if you violate these Terms or misuse the service. You may stop using Grow UP at any time and may request data deletion by contacting {SUPPORT_EMAIL}.</p>

      <h2>10. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, Grow UP is provided “as is” and “as available”. We are not liable for financial losses, lost data, lost profits, indirect damages, or decisions made based on information in the app.</p>

      <h2>11. Changes to These Terms</h2>
      <p>We may update these Terms periodically. Updated versions will be posted at https://growupapp.app/terms. Continued use of Grow UP after updates means you accept the revised Terms.</p>

      <h2>12. Governing Law</h2>
      <p>These Terms are governed by the laws of Victoria, Australia, unless otherwise required by applicable law.</p>

      <h2>13. Contact</h2>
      <p>For questions about these Terms, contact Gilbert Ogbara at {SUPPORT_EMAIL}.</p>
    </article>
  );
}



export function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email) return;
    if (supabase) {
      await supabase.from("account_deletion_requests").insert({ email, requested_at: new Date().toISOString() }).catch(() => {});
    }
    setSubmitted(true);
  };

  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"48px 24px",fontFamily:"inherit"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:48,marginBottom:12}}>🌱</div>
        <h1 style={{fontSize:28,fontWeight:900,margin:"0 0 8px"}}>Delete Your Account</h1>
        <p style={{color:"#6D706F",margin:0,lineHeight:1.5}}>
          Submit your request below. We'll permanently delete your account and all associated data within 30 days.
        </p>
      </div>

      {submitted ? (
        <div style={{background:"#e8f7ee",border:"1.5px solid #3fa463",borderRadius:16,padding:24,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:12}}>✓</div>
          <h2 style={{color:"#1a7a40",margin:"0 0 8px",fontSize:20,fontWeight:900}}>Request received</h2>
          <p style={{color:"#236b4a",margin:0}}>We'll process your deletion request within 30 days and send a confirmation to <strong>{email}</strong>.</p>
        </div>
      ) : (
        <div style={{background:"white",border:"1.5px solid #e5e7eb",borderRadius:16,padding:24}}>
          <label style={{display:"block",marginBottom:16}}>
            <span style={{fontSize:14,fontWeight:800,color:"#374151",display:"block",marginBottom:6}}>Email address on your account</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #d1d5db",fontSize:16,boxSizing:"border-box"}}
            />
          </label>
          <button
            onClick={handleSubmit}
            disabled={!email}
            style={{width:"100%",padding:14,borderRadius:12,background:email?"#e5292f":"#d1d5db",color:"white",fontWeight:900,fontSize:16,border:"none",cursor:email?"pointer":"not-allowed"}}
          >
            Request account deletion
          </button>
          <p style={{fontSize:12,color:"#9ca3af",textAlign:"center",marginTop:12,lineHeight:1.5}}>
            This will permanently delete your account, all snapshots, goals, and financial data. This cannot be undone.
            You can also email <a href="mailto:support@lgds.com.au" style={{color:"#3fa463"}}>support@lgds.com.au</a>
          </p>
        </div>
      )}
    </div>
  );
}


