"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, LogOut, X, Crown, PencilLine, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import { progressApi } from "@/lib/api/progress";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ALL_CATEGORIES } from "@/lib/constants";

export default function UserPopup() {
  const { user, logout, preferences, setPreferences, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [selected, setSelected] = useState<string[]>(preferences);
  const [saving, setSaving] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => progressApi.getStats(),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const handleRename = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === user?.name) {
      setRenaming(false);
      return;
    }
    setSavingName(true);
    try {
      const { authApi } = await import("@/lib/api/auth");
      const updated = await authApi.updateProfile({ name: trimmed });
      setUser(updated);
      setRenaming(false);
      toast.success("Name updated");
    } catch {
      toast.error("Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  useEffect(() => {
    setSelected(preferences);
  }, [preferences]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleCategory = (cat: string) => {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setPreferences(selected);
      setEditing(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const { theme, setTheme } = useTheme();
  const name = user.name || user.email || "";
  const shortName = name.length > 15 ? name.slice(0, 15) + "..." : name;

  return (
    <div className="relative" ref={popupRef}>
      <button
        onClick={() => { setOpen(!open); setEditing(false); setRenaming(false); }}
        className="flex items-center gap-2 text-muted text-sm font-medium transition-colors hover:text-fg cursor-pointer"
      >
        <span>{shortName}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-bg-card border border-border rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50"
          >
            <div className="p-4 border-b border-border-subtle">
              <div className="min-w-0">
                  {renaming ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleRename(); }}
                      className="flex items-center gap-1"
                    >
                      <input
                        autoFocus
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="flex-1 bg-bg-input border border-border rounded px-2 py-1 text-sm text-fg outline-none"
                        placeholder="Your name"
                      />
                      <button
                        type="submit"
                        disabled={savingName}
                        className="text-xs font-bold text-bg bg-fg px-2 py-1 rounded hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-30"
                      >
                        {savingName ? "..." : "Save"}
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-fg truncate">
                        {user.name || "User"}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenaming(true); setNameInput(user.name || ""); }}
                        className="text-muted-dark hover:text-fg transition-colors cursor-pointer shrink-0"
                      >
                        <PencilLine size={13} />
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-muted-dark truncate">
                    {user.email}
                  </div>
                  {stats && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-bold text-[#a78bfa]">{stats.rank}</span>
                      <span className="text-[8px] text-muted-dark">•</span>
                      <span className="text-[10px] text-muted">Level {stats.rankLevel}</span>
                      <span className="text-[8px] text-muted-dark">•</span>
                      <span className="text-[10px] text-muted-dark">{stats.totalXp?.toLocaleString() || 0} XP</span>
                    </div>
                  )}
                </div>
              </div>

            {!editing ? (
              <div className="p-3">
                {user.subscriptionStatus !== "FREE" && (
                  <div className="mb-2 px-3 py-2.5 bg-premium/5 border border-premium/15 rounded-lg flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Crown size={14} className="text-premium flex-shrink-0" />
                      <span className="text-xs font-semibold text-premium truncate">
                        {user.subscriptionStatus === "LIFETIME" ? "Lifetime" : user.subscriptionStatus === "YEARLY" ? "Yearly" : "Monthly"}
                      </span>
                    </div>
                    <Link
                      href="/manage"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[0.625rem] text-muted hover:text-fg bg-transparent border border-border hover:border-border-light rounded-md px-2 py-1 cursor-pointer transition-colors shrink-0 no-underline"
                    >
                      Manage
                    </Link>
                  </div>
                )}
                <button
                  onClick={() => { setEditing(true); setSelected(preferences); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-fg hover:bg-bg-elevated transition-colors cursor-pointer"
                >
                  <Settings size={15} />
                  <span>Category Preferences</span>
                </button>
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-fg hover:bg-bg-elevated transition-colors cursor-pointer"
                >
                  {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>
                <button
                  onClick={() => { logout(); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-red-400 hover:bg-red-500/5 transition-colors cursor-pointer"
                >
                  <LogOut size={15} />
                  <span>Log out</span>
                </button>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-fg">Choose your topics</h3>
                  <button
                    onClick={() => setEditing(false)}
                    className="text-muted-dark hover:text-fg transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4 max-h-48 overflow-y-auto">
                  {ALL_CATEGORIES.map((cat) => {
                    const active = selected.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          active
                            ? "bg-fg text-bg"
                            : "bg-bg-elevated text-muted hover:text-fg hover:bg-bg-card"
                        }`}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, " ")}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || selected.length === 0}
                  className="w-full py-2.5 bg-fg text-bg rounded-lg text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save Preferences"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
