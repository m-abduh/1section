"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleOpenSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  if (!user) return null;

  if (!mounted) {
    return (
      <div className="flex h-screen bg-[#050505]">
        <aside className="w-64 h-screen bg-[#080808] border-r border-white/5 flex flex-col shrink-0">
          <div className="p-6 border-b border-white/5">
            <div className="text-xl font-black tracking-tight">
              <span className="text-white">1section</span>{" "}
              <span className="text-[#555] font-bold">Admin</span>
            </div>
          </div>
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 border-b border-white/5 flex items-center gap-4 px-8 bg-[#050505]">
            <h1 className="text-lg font-bold text-white">Dashboard</h1>
          </header>
          <main className="flex-1 overflow-y-auto p-8">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#050505]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
        isMobile={isMobile}
      />

      {isMobile && sidebarOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 20,
          }}
          onClick={handleCloseSidebar}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={handleOpenSidebar} isMobile={isMobile} />
        <main className="flex-1 overflow-y-auto p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
