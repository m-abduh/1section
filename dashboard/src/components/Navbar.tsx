"use client";

import { useAuth } from "@/lib/auth";
import { Menu } from "lucide-react";

interface NavbarProps {
  onMenuClick?: () => void;
  isMobile: boolean;
}

export default function Navbar({ onMenuClick, isMobile }: NavbarProps) {
  const { user } = useAuth();
  const displayName = user?.name?.slice(0, 15) || "Admin";

  return (
    <header className="h-16 border-b border-white/5 flex items-center gap-4 px-8 bg-[#050505]">
      {isMobile && onMenuClick && (
        <button
          onClick={onMenuClick}
          className="p-2 text-[#666] hover:text-white rounded-lg hover:bg-white/5 transition-all"
        >
          <Menu size={20} />
        </button>
      )}

      <h1 className="text-lg font-bold text-white">Dashboard</h1>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] flex items-center justify-center text-xs font-bold text-white shrink-0">
          {user?.name?.charAt(0)?.toUpperCase() || "A"}
        </div>
        {!isMobile && (
          <div>
            <div className="text-sm font-medium text-white">{displayName}</div>
            <div className="text-xs text-[#555]">{user?.email}</div>
          </div>
        )}
      </div>
    </header>
  );
}
