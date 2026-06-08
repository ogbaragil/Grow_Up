import { useCallback, useEffect, useState } from "react";

// Persisted suppression keys.
const DISMISS_KEY = "growup_install_dismissed";   // "1" once the user taps "Don't show again"
const INSTALLED_KEY = "growup_pwa_installed";       // "1" once the app has been installed

// True when the app is already running as an installed PWA (so we never prompt).
function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    window.navigator.standalone === true // iOS Safari, when launched from the home screen
  );
}

// iPhone / iPad detection. iPadOS 13+ reports as "MacIntel" with multi-touch,
// which is how we tell an iPad apart from an actual Mac.
function detectIOS() {
  if (typeof navigator === "undefined") return { isIOS: false, isIPad: false };
  const ua = navigator.userAgent || "";
  const isIPad =
    /iPad/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone|iPod/.test(ua);
  return { isIOS: isIPhone || isIPad, isIPad };
}

// We only target phones/tablets, not desktop. A coarse primary pointer (or any
// touch points) is the most reliable proxy for a touch device.
function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(pointer: coarse)")?.matches === true ||
    navigator.maxTouchPoints > 0
  );
}

function readStored(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeStored(key) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* storage may be unavailable; ignore */
  }
}

/**
 * Surfaces the PWA install affordance.
 *
 * - Android / Chromium: one-tap install via the captured `beforeinstallprompt`
 *   event (stashed globally in index.html so we never miss an early fire).
 * - iOS / iPadOS: Safari has no programmatic install, so we expose an
 *   "Add to Home Screen" instructions flag instead.
 *
 * It stays suppressed when the app is already installed/standalone, or once the
 * user picks "Don't show again". A soft `dismiss()` only hides it for the
 * current session, so it returns on the next open (per product spec).
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(
    () => (typeof window !== "undefined" && window.__deferredInstallPrompt) || null
  );
  const [installed, setInstalled] = useState(
    () => isStandalone() || readStored(INSTALLED_KEY)
  );
  const [dismissedForever, setDismissedForever] = useState(() => readStored(DISMISS_KEY));
  const [dismissedSession, setDismissedSession] = useState(false);

  useEffect(() => {
    const onAvailable = () => setDeferred(window.__deferredInstallPrompt || null);
    const onBeforeInstall = (e) => {
      e.preventDefault();
      window.__deferredInstallPrompt = e;
      setDeferred(e);
    };
    const onInstalled = () => {
      window.__deferredInstallPrompt = null;
      setDeferred(null);
      setInstalled(true);
      writeStored(INSTALLED_KEY);
    };

    // Custom events are fired by the early capture script in index.html.
    window.addEventListener("growup:installavailable", onAvailable);
    window.addEventListener("growup:installed", onInstalled);
    // Direct listeners as a fallback if the component mounts first.
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Catch an event that may have fired before this hook mounted.
    if (window.__deferredInstallPrompt) setDeferred(window.__deferredInstallPrompt);

    return () => {
      window.removeEventListener("growup:installavailable", onAvailable);
      window.removeEventListener("growup:installed", onInstalled);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const evt = deferred || (typeof window !== "undefined" && window.__deferredInstallPrompt);
    if (!evt) return;
    try {
      evt.prompt();
      const choice = await evt.userChoice;
      if (choice?.outcome === "accepted") {
        setInstalled(true);
        writeStored(INSTALLED_KEY);
      }
    } catch {
      /* user agent declined to show the dialog; ignore */
    }
    window.__deferredInstallPrompt = null;
    setDeferred(null);
  }, [deferred]);

  // Hide for this session only — returns on next open.
  const dismiss = useCallback(() => setDismissedSession(true), []);
  // Persist suppression — never show again.
  const dontShowAgain = useCallback(() => {
    setDismissedForever(true);
    writeStored(DISMISS_KEY);
  }, []);

  const { isIOS, isIPad } = detectIOS();
  const standalone = isStandalone();
  const suppressed = installed || standalone || dismissedForever || dismissedSession;

  const canOneTap = !!deferred && isTouchDevice(); // Android/Chromium on a touch device
  const iosCard = isIOS && !standalone;            // iOS/iPadOS manual instructions

  return {
    available: !suppressed && (canOneTap || iosCard),
    mode: iosCard ? "ios" : "android",
    isIPad,
    promptInstall,
    dismiss,
    dontShowAgain,
  };
}
