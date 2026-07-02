"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <div className="flex h-dvh flex-col">
      {!isLanding && <Navbar />}
      
       <main className={`flex-1 w-full pb-14 md:pb-0 overflow-y-auto ${!isLanding ? 'pt-16' : ''}`}>
        {children}
      </main>
    </div>
  );
}