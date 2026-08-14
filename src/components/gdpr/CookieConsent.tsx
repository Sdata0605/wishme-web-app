import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const COOKIE_CONSENT_KEY = "wishme_cookie_consent";

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const t = window.setTimeout(() => setShowBanner(true), 800);
      return () => window.clearTimeout(t);
    }
  }, []);

  const dismiss = (value: "accepted" | "rejected") => {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:left-auto sm:right-6 sm:mx-0">
      <p className="text-sm text-slate-700">
        We use cookies for essential features and analytics.{" "}
        <Link to="/privacy-policy" className="font-medium text-[#ea580c] hover:underline">
          Privacy
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => dismiss("rejected")}
          className="h-9 flex-1 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => dismiss("accepted")}
          className="h-9 flex-1 rounded-lg bg-[#ff5c00] text-sm font-semibold text-white hover:bg-[#ea580c]"
        >
          Accept
        </button>
      </div>
    </div>
  );
};
