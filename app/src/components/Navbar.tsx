"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  LayoutDashboard,
  Library,
  BookOpen,
  FileText,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import UserPopup from "@/components/UserPopup";


const landingLinks = [
  { label: "Preview", href: "#preview" },
  { label: "Features", href: "#features" },
  { label: "Analysis", href: "#analysis" },
  { label: "Feedback", href: "#feedback" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLanding = pathname === "/";

  const appLinks = [
    { name: "Explore", href: "/models", icon: Compass },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Favorites", href: "/favorites", icon: Library },
    { name: "Reflections", href: "/reflections", icon: BookOpen },
    { name: "Notebook", href: "/notebook", icon: FileText },
  ];

  if (isLanding) {
    return (
      <header className="fixed top-0 z-50 w-full">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl" />
        <div className="relative mx-auto flex h-14 sm:h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/1section.svg" alt="1section" className="h-8 w-auto" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {landingLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-white/50 transition-colors duration-200 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden md:block">
                <UserPopup />
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden md:inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20"
              >
                Login
              </Link>
            )}
          </div>

          <button
            className="relative z-10 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5 text-white" /> : (
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="8" x2="21" y2="8" />
                <line x1="3" y1="16" x2="21" y2="16" />
              </svg>
            )}
          </button>
        </div>

        <div
          className={`overflow-hidden bg-black/95 backdrop-blur-2xl transition-all duration-300 md:hidden ${mobileOpen ? "max-h-80" : "max-h-0"}`}
        >
          <div className="flex flex-col gap-2 px-4 py-4">
            {landingLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="mt-2 rounded-full bg-white px-5 py-2.5 text-center text-sm font-semibold text-black"
            >
              Login
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <nav className="fixed top-0 z-50 w-full bg-bg/70 border-b border-border-subtle backdrop-blur-2xl">
        <div className="h-16 flex items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <img src="/1section.svg" alt="1SECTION" className="h-8 w-auto" />
            {user && user.subscriptionStatus && user.subscriptionStatus !== "FREE" && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-premium/10 border border-premium/20 text-[0.625rem] font-bold text-premium">
                Pro
              </div>
            )}
          </Link>

          <div className="hidden md:flex gap-0.5">
            {appLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link key={link.name} href={link.href} className="no-underline">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${isActive ? 'text-fg bg-bg-elevated' : 'text-muted hover:text-fg'}`}>
                    <Icon size={15} />
                    <span>{link.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <UserPopup />
            ) : (
              <Link href="/login" className="flex items-center gap-2 px-3 py-1.5 rounded border border-border text-muted text-sm font-medium transition-colors hover:text-fg hover:border-border-light hover:bg-bg-elevated">
                <User size={16} />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <nav className="fixed bottom-0 inset-x-0 z-50 bg-bg border-t border-border-subtle md:hidden">
        <div className="flex items-center justify-around h-14">
          {appLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link key={link.name} href={link.href} className="no-underline flex-1 flex justify-center">
                <div className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-colors ${isActive ? 'text-fg' : 'text-muted-dark'}`}>
                  <Icon size={20} />
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
