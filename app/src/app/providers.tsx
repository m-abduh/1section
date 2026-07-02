"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { useAuthStore } from "@/lib/store/auth";
import { ReadingProvider } from "@/contexts/ReadingContext";

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const validateToken = useAuthStore((s) => s.validateToken);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-6 h-6 border-2 border-border rounded-full border-t-fg animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
        <ReadingProvider>
          <AuthInitializer>
            {children}
          </AuthInitializer>
        </ReadingProvider>
      </ThemeProvider>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#111",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
