"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Tag,
  CreditCard,
  MessageSquare,
  Zap,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/modules", label: "Modules", icon: BookOpen },
  { href: "/dashboard/categories", label: "Categories", icon: Tag },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/dashboard/auto-generate", label: "Auto Generate", icon: Zap },
];

export default function Sidebar({ isOpen, onClose, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleNavClick = () => {
    if (isMobile) onClose();
  };

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 30,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 300ms ease-in-out",
      }
    : {};

  return (
    <aside
      style={sidebarStyle}
      className="w-64 h-screen bg-[#080808] border-r border-white/5 flex flex-col shrink-0"
    >
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <Link href="/dashboard" onClick={handleNavClick} className="text-xl font-black tracking-tight">
          <span className="text-white">1section</span>{" "}
          <span className="text-[#555] font-bold">Admin</span>
        </Link>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-2 text-[#666] hover:text-white rounded-lg hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const isOverview = href === "/dashboard";
          const active = isOverview
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-white/10 text-white"
                  : "text-[#666] hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => {
            logout();
            if (isMobile) onClose();
          }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[#666] hover:text-red-400 hover:bg-red-500/5 w-full transition-all"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
