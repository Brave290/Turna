"use client";

import { motion } from "framer-motion";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-md"
      >
        <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center text-xl font-bold mx-auto mb-4">
          !
        </div>
        <h1 className="text-2xl font-bold text-forest mb-2">
          Something went wrong
        </h1>
        <p className="text-muted mb-6">
          We couldn&apos;t load this page. Please try again.
        </p>
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
      </motion.div>
    </div>
  );
}
