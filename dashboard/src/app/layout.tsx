"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useAuth, setRouterPush } from "@/lib/auth";
import LoadingSpinner from "@/components/LoadingSpinner";
import "./globals.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AuthInit({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { checkAuth, isLoading } = useAuth();

  useEffect(() => {
    setRouterPush((href) => router.push(href));
    checkAuth();
  }, [checkAuth, router]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#050505]">
        <LoadingSpinner size={24} />
      </div>
    );
  }

  return <>{children}</>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthInit>
            {children}
          </AuthInit>
          <Toaster
            position="bottom-right"
            theme="dark"
          />
        </QueryClientProvider>
      </body>
    </html>
  );
}
