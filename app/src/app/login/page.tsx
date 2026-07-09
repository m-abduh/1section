"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { ArrowLeft } from "lucide-react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function LoginPage() {
  const router = useRouter();
  const { login, register, loginWithGoogle, user } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      if (!user.preferredCategories || user.preferredCategories.length === 0) {
        router.push("/preferences");
      } else {
        router.push("/models");
      }
    }
  }, [user, router]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name || undefined, confirmPassword);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#030303] flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,95,0,0.12)_0%,transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(167,139,250,0.08)_0%,transparent_40%)] pointer-events-none" />

      <button
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
          } else {
            router.push("/");
          }
        }}
        className="absolute top-5 left-5 z-20 flex items-center gap-2 text-[#666] hover:text-white transition-colors cursor-pointer bg-transparent border-none"
      >
        <ArrowLeft size={20} />
        <span className="text-sm">Back</span>
      </button>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[400px] relative z-10"
      >
        <div className="text-center mb-10">
          <img src="/1section.svg" alt="1SECTION" className="w-32 h-32 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-white mb-2">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-[#555] text-sm">
            {mode === "login" ? "Continue your learning journey" : "Start mastering your mind"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {mode === "register" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-[#555] focus:outline-none focus:border-white/20 transition-colors"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-[#555] focus:outline-none focus:border-white/20 transition-colors"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-[#555] focus:outline-none focus:border-white/20 transition-colors"
          />

          {mode === "register" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-[#555] focus:outline-none focus:border-white/20 transition-colors"
              />
            </motion.div>
          )}

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-white text-black rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[#444] text-xs">or</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <GoogleLoginButton onSuccess={loginWithGoogle} />
        </GoogleOAuthProvider>

        <p className="text-center mt-6 text-xs text-[#444]">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="text-[#888] underline hover:text-white transition-colors cursor-pointer bg-transparent border-none"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>

        <p className="text-center mt-4 text-[0.65rem] text-[#333]">
          By continuing, you agree to our{" "}
          <Link href="#" className="text-[#555] underline hover:text-white transition-colors">Terms</Link> and{" "}
          <Link href="#" className="text-[#555] underline hover:text-white transition-colors">Privacy</Link>
        </p>
      </motion.div>
      </div>
    </div>
  );
}
