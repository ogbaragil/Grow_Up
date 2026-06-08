import React from "react";
import { X, Download, Share, Plus } from "lucide-react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

/**
 * Install affordance shown on the auth (sign-up) and overview screens only.
 * `show` is the screen-level gate; the hook decides whether it's actually
 * eligible (not installed, not dismissed, supported device).
 *
 * `aboveNav` lifts it clear of the fixed bottom tab bar on the overview.
 */
export function InstallPrompt({ show, aboveNav = false }) {
  const { available, mode, isIPad, promptInstall, dismiss, dontShowAgain } = useInstallPrompt();

  if (!show || !available) return null;

  return (
    <div
      className={`install-prompt${aboveNav ? " install-prompt--above-nav" : ""}`}
      role="dialog"
      aria-label="Install Grow UP"
    >
      <button className="install-prompt-close" onClick={dismiss} aria-label="Dismiss">
        <X size={18} />
      </button>

      <div className="install-prompt-head">
        <div className="install-prompt-icon">
          <img src="/icons/growup-logo.png" alt="" />
        </div>
        <div className="install-prompt-copy">
          <strong>Install Grow UP</strong>
          <span>Add it to your home screen for a faster, full-screen experience.</span>
        </div>
      </div>

      {mode === "android" ? (
        <div className="install-prompt-actions">
          <button className="install-prompt-cta" onClick={promptInstall}>
            <Download size={16} /> Install app
          </button>
          <button className="install-prompt-later" onClick={dontShowAgain}>
            Don&apos;t show again
          </button>
        </div>
      ) : (
        <>
          <ol className="install-prompt-steps">
            <li>
              <span className="ip-step-ic"><Share size={15} /></span>
              <span>Tap the <strong>Share</strong> button {isIPad ? "in the toolbar" : "in the Safari toolbar"}.</span>
            </li>
            <li>
              <span className="ip-step-ic"><Plus size={15} /></span>
              <span>Choose <strong>Add to Home Screen</strong>.</span>
            </li>
          </ol>
          <div className="install-prompt-actions install-prompt-actions--ios">
            <button className="install-prompt-later" onClick={dontShowAgain}>
              Don&apos;t show again
            </button>
          </div>
        </>
      )}
    </div>
  );
}
