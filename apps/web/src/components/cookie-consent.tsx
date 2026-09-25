"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Cookie } from "lucide-react";

const COOKIE_KEY = "turna_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(COOKIE_KEY, "essential");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.55 }}
          className="no-print fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6"
          role="dialog"
          aria-label="Cookie consent"
        >
          <div className="mx-auto max-w-3xl rounded-[18px] bg-forest text-white border border-white/10 shadow-card p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Cookie className="w-5 h-5 text-primary-light shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">
                    We use cookies
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    Essential cookies keep you signed in. We also use analytics cookies to
                    improve Turna.{" "}
                    <Link href="/legal/cookies" className="text-primary-light hover:underline">
                      Cookie Policy
                    </Link>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={decline}
                  className="btn-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/25 hover:border-white/40 flex-1 sm:flex-none rounded-xl px-4 py-2 font-semibold transition-all"
                >
                  Essential only
                </button>
                <button
                  type="button"
                  onClick={accept}
                  className="btn-primary btn-sm flex-1 sm:flex-none"
                >
                  Accept all
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
