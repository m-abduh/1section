"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { RotateCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,95,0,0.10)_0%,transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(167,139,250,0.06)_0%,transparent_40%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[420px] relative z-10 text-center"
      >
        <div className="mb-10">
          <img src="/1section.svg" alt="1SECTION" className="h-10 mx-auto mb-8 opacity-60" />
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <span className="text-4xl font-black text-white/20">!</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 font-[family-name:var(--font-outfit)]">
            Something went wrong
          </h1>
          <p className="text-[#555] text-sm max-w-[300px] mx-auto leading-relaxed">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
          >
            <RotateCcw size={15} />
            Try Again
          </button>
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-[#555] text-sm font-medium hover:text-white transition-colors no-underline"
          >
            <Home size={15} />
            Go Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
