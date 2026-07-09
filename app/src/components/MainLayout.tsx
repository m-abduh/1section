"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isLogin = pathname === "/login";

  return (
    <div className="flex h-dvh flex-col">
      {!isLanding && !isLogin && <Navbar />}
      <main className={`flex-1 w-full overflow-y-auto ${!isLanding && !isLogin ? 'pt-16' : ''} ${!isLogin ? 'pb-14 md:pb-0' : ''}`}>
        {children}
      </main>
    </div>
  );
}