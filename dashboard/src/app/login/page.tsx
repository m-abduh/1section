"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
      toast.success("Welcome back!");
    } catch (err: any) {
      const errData = err.response?.data?.error;
      const errMsg = typeof errData === "string" ? errData : errData?.message || "Login failed";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-3xl font-black tracking-tight mb-2">
            <span className="text-white">1section</span>{" "}
            <span className="text-[#555]">Admin</span>
          </div>
          <p className="text-[#666] text-sm">Sign in to manage your platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#555] uppercase tracking-wider block mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#080808] border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 transition-all placeholder:text-[#444]"
              placeholder="admin@1section.com"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#555] uppercase tracking-wider block mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#080808] border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 transition-all placeholder:text-[#444]"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
