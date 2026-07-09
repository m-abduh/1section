"use client";

import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
  backLink?: string;
  backLabel?: string;
}

export default function ErrorPage({
  error,
  reset,
  backLink = "/",
  backLabel = "Go Home",
}: ErrorPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-fg">Something went wrong</h1>
          <p className="text-sm text-muted leading-relaxed">
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-fg text-bg text-sm font-semibold hover:opacity-90 transition-all cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href={backLink}
            className="px-5 py-2.5 rounded-xl bg-bg-elevated border border-border text-fg text-sm font-semibold hover:bg-bg transition-all"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
