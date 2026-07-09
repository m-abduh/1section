"use client";

import ErrorPage from "@/components/ErrorPage";

export default function ModelsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPage error={error} reset={reset} backLink="/models" backLabel="Back to Library" />;
}
