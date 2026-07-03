"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactFlow, Background, Handle, Position, useReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import React from "react";
import { CheckCircle2, Zap, Crown, ShieldCheck, Library, Play, ArrowRight, Sparkles, Network, Clock, BookOpen, Star, Quote, Map, Waypoints, Brain, Headphones, Award, Lightbulb, Send } from "lucide-react";
import Marquee from "react-fast-marquee";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SectionHeader from "@/components/SectionHeader";
import { ModuleCard } from "@/components/ModuleCard";
import { paymentsApi } from "@/lib/api/payments";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth-context";
import { reviewsApi } from "@/lib/api/reviews";
import { paymentWs } from "@/lib/websocket";
import { useModulesList } from "@/lib/query-hooks";
import { openCheckout, initLemonSqueezy } from "@/lib/lemon-squeezy";

// Custom Node Component for MiniPreview
const CustomNode = ({ data }: { data: any }) => (
  <div className="bg-[#111] text-white border border-[#222] rounded-xl px-3 py-2.5 text-xs font-bold text-center min-w-[120px]">
    <Handle type="target" position={Position.Top} className="!bg-[#333] !border-0 !w-2 !h-2" />
    {data.label}
    <Handle type="source" position={Position.Bottom} className="!bg-[#333] !border-0 !w-2 !h-2" />
  </div>
);

const nodeTypes = { custom: CustomNode };

const FlowFocus = ({ nodeId }: { nodeId: string }) => {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({
        nodes: [{ id: nodeId }],
        padding: 0.8,
        duration: 0,
        minZoom: 0.8,
        maxZoom: 1.2
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [nodeId, fitView]);

  return null;
};

const MiniPreview = ({ nodes, edges }: { nodes: any[], edges: any[] }) => {
  const styledNodes = useMemo(() => nodes.map(n => ({
    ...n,
    style: n.type === 'custom' ? n.style : {
      ...n.style,
      background: '#111',
      color: '#fff',
      border: '1px solid #222',
      borderRadius: '10px',
      fontSize: '12px',
      fontWeight: 600,
      padding: '10px 14px',
      width: 'auto',
      minWidth: '100px',
      textAlign: 'center' as const
    }
  })), [nodes]);

  const styledEdges = useMemo(() => edges.map(e => ({
    ...e,
    animated: true,
    style: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 }
  })), [edges]);

  return (
    <div className="h-[260px] w-full bg-[#050505] rounded-3xl overflow-hidden border border-white/5 pointer-events-none my-6">
      <ReactFlowProvider>
        <ReactFlow
          nodes={styledNodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          proOptions={{ hideAttribution: true }}
          defaultViewport={{ x: 0, y: 50, zoom: 1 }}
        >
          <Background color="#111" gap={12} size={0.5} />
          <FlowFocus nodeId="1" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};

function VantaBackground() {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let instance: any = null
    const init = async () => {
      const mod: any = await import("three")
      const THREE = mod.default || mod
      ;(window as any).THREE = THREE
      const NET = (await import("vanta/dist/vanta.net.min")).default
      if (ref.current && !instance) {
        instance = NET({
          el: ref.current,
          mouseControls: true,
          touchControls: false,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1,
          scaleMobile: 1,
          color: 0x737373,
          backgroundColor: 0x000000,
          points: 5,
          maxDistance: 40,
          spacing: 35,
          showDots: true,
        })
        try {
          instance.points?.forEach((p: any) => { p.r = (Math.random() * 4 - 2) * 5 })
        } catch {}
        setTimeout(() => {
          setReady(true)
          try {
            instance.points?.forEach((p: any) => p.scale.set(80, 80, 80))
          } catch {}
        }, 500)
      }
    }
    init()
    return () => {
      instance?.destroy()
    }
  }, [])

  return (
    <>
      <div ref={ref} className="absolute inset-0 transition-opacity duration-300" style={{ opacity: ready ? 0.4 : 0 }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_#000_75%)] pointer-events-none" />
    </>
  )
}

export default function Home() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const wsConnected = useRef<string | null>(null);

  // Listen for subscription changes via WebSocket (connect once per user session)
  useEffect(() => {
    if (!user?.id) return;
    if (wsConnected.current === user.id) return;
    wsConnected.current = user.id;
    const onPaymentSuccess = () => router.push("/payment/success");
    const refresh = () => authApi.getMe().then((u) => setUser(u)).catch(() => {});
    const unsub1 = paymentWs.on("payment_success", onPaymentSuccess);
    const unsub2 = paymentWs.on("subscription_updated", refresh);
    paymentWs.connect(user.id);
    return () => { unsub1(); unsub2(); };
  }, [user?.id]);

  useEffect(() => { initLemonSqueezy(); }, []);

  const { data: modulesData } = useModulesList({ limit: "4" });

  const sampleProducts = modulesData?.data || [];

  const categoryMeta: Record<string, { icon: any; desc: string }> = {
    mindset: { icon: Network, desc: "Develop powerful thinking frameworks" },
    clarity: { icon: Sparkles, desc: "Cut through complexity with precision" },
    habit: { icon: ShieldCheck, desc: "Build systems that stick" },
    action: { icon: Zap, desc: "Convert knowledge into results" },
    strategy: { icon: Crown, desc: "Plan for long-term success" },
    "decision-making": { icon: CheckCircle2, desc: "Make better choices faster" },
    communication: { icon: Clock, desc: "Express ideas effectively" },
    relationships: { icon: Library, desc: "Build meaningful connections" },
    focus: { icon: Zap, desc: "Sharpen your concentration" },
    productivity: { icon: Zap, desc: "Do more with less effort" },
    creativity: { icon: Sparkles, desc: "Unlock innovative thinking" },
    learning: { icon: BookOpen, desc: "Accelerate your skill acquisition" },
    wellbeing: { icon: ShieldCheck, desc: "Nurture your mental health" },
    logic: { icon: Network, desc: "Reason with precision" },
    psychology: { icon: BookOpen, desc: "Understand the mind" },
    success: { icon: Crown, desc: "Achieve your goals" },
    stoicism: { icon: ShieldCheck, desc: "Build resilience and calm" },
    "cognitive-bias": { icon: Network, desc: "Recognize thinking traps" },
    business: { icon: Crown, desc: "Grow your venture" },
    "mental-model": { icon: Network, desc: "Build a lattice of mental models" },
    "problem-solving": { icon: Zap, desc: "Solve tough problems" },
    "game-theory": { icon: Network, desc: "Master strategic thinking" },
    resilience: { icon: ShieldCheck, desc: "Bounce back stronger" },
    risk: { icon: ShieldCheck, desc: "Navigate uncertainty" },
    economics: { icon: Crown, desc: "Understand market forces" },
  };

  const handleSubscribe = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setSubscribing("loading");
    try {
      const result = await paymentsApi.createCheckout();
      if (result.url) {
        openCheckout(result.url);
      }
      setSubscribing(null);
    } catch (err) {
      console.error("Checkout error:", err);
      setSubscribing(null);
    }
  };

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  return (
    <>
      <Navbar />
        {/* Hero Section */}
        <section className="relative min-h-screen overflow-hidden bg-black">
          <VantaBackground />

          <div className="relative mx-auto flex min-h-screen flex-col items-center justify-center gap-6 px-4 sm:px-6 lg:grid lg:grid-cols-2 lg:gap-12 lg:max-w-[1200px]">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[0.625rem] font-medium tracking-wider text-white sm:px-4 sm:py-1.5 sm:text-xs"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-[#f97316] animate-pulse" />
                The Ultimate Cognitive Library
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-5xl md:text-6xl lg:text-7xl max-w-xl"
              >
                Master your<br />
                <span className="text-[#f97316]">thinking library</span>.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 max-w-lg text-sm leading-relaxed text-white/40 sm:text-base sm:mt-5 lg:mt-6 lg:text-lg"
              >
                Explore an expansive library of mental models, cognitive tools, and frameworks. Internalize complex concepts through interactive mapping and committed action.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 flex flex-row items-center justify-center gap-2 sm:gap-3 lg:justify-start"
              >
                <Link
                  href="/models"
                  className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-semibold text-black transition-all duration-300 hover:bg-[#e5e5e5] hover:shadow-xl hover:shadow-white/20 sm:px-7 sm:py-3.5 sm:text-sm"
                >
                  Explore Modules
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4" />
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 flex flex-row flex-wrap items-center justify-center gap-2 sm:mt-6 sm:gap-3 lg:justify-start"
              >
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 opacity-50 cursor-not-allowed sm:px-4 sm:py-2.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white sm:w-5 sm:h-5" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  <div className="text-left">
                    <div className="text-[0.4375rem] text-[#666] leading-tight sm:text-[0.5rem]">Download on the</div>
                    <div className="text-[0.6875rem] font-bold text-white leading-tight sm:text-[0.8125rem]">App Store</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 opacity-50 cursor-not-allowed sm:px-4 sm:py-2.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white sm:w-5 sm:h-5" xmlns="http://www.w3.org/2000/svg"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 0 1 0 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>
                  <div className="text-left">
                    <div className="text-[0.4375rem] text-[#666] leading-tight sm:text-[0.5rem]">Get it on</div>
                    <div className="text-[0.6875rem] font-bold text-white leading-tight sm:text-[0.8125rem]">Google Play</div>
                  </div>
                </div>
                <span className="text-[0.5rem] text-[#444] font-semibold sm:text-[0.625rem]">Mobile app in development</span>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center pointer-events-none select-none lg:max-w-none max-w-[280px] sm:max-w-[350px] lg:max-w-full"
            >
              <img src="/landing/hero.png" alt="" className="w-full object-contain opacity-80" draggable={false} />
            </motion.div>

            <motion.a
              href="#preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.4 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-xs text-white/25 transition-colors hover:text-white"
            >
              <span>Scroll to explore</span>
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </motion.div>
            </motion.a>
          </div>
        </section>

        {/* Preview Section */}
        <section id="preview" className="w-full py-32 sm:py-40">
          <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
            <SectionHeader
              badge="Preview"
              title="Take a look inside"
              accent="inside"
              description="A first look at your future dashboard — your command center with progress tracking, a library of mental models, daily bite-sized lessons, personal insights on your growth, and a community of fellow thinkers."
            />

            <div className="space-y-20">
              {[
                {
                  title: "Dashboard",
                  badge: "Dashboard",
                  desc: "Your command center. See your progress, recommended modules, recent activity, and learning streaks at a glance.",
                  image: "/features/dashboard.png",
                  color: "#3b82f6",
                },
                {
                  title: "Explore Modules",
                  badge: "Library",
                  desc: "Browse the full collection of mental models. Filter by category, search by keyword, or discover your daily free theory.",
                  image: "/features/models.png",
                  color: "#10b981",
                },
                {
                  title: "Notebook",
                  badge: "Notes",
                  desc: "Capture your thoughts and insights as you learn. Your personal notebook syncs across devices for seamless journaling.",
                  image: "/features/notebook.png",
                  color: "#f43f5e",
                },
                {
                  title: "Reflections",
                  badge: "Journal",
                  desc: "Review your learning journey with daily reflections. Track how your understanding of mental models deepens over time.",
                  image: "/features/reflections.png",
                  color: "#f59e0b",
                },
                {
                  title: "Favorites",
                  badge: "Saved",
                  desc: "Bookmark your favourite mental models for quick access. Build your personal curated library of timeless concepts.",
                  image: "/features/favorites.png",
                  color: "#ef4444",
                },
                {
                  title: "Detail Map",
                  badge: "Map",
                  desc: "Visualise how mental models connect and relate. See the big picture with an interactive map of ideas and concepts.",
                  image: "/features/detile map.png",
                  color: "#6366f1",
                },
                {
                  title: "Reading View",
                  badge: "Learn",
                  desc: "Dive deep into each mental model with rich reading content, text-to-speech narration, and word-level highlighting.",
                  image: "/features/read.png",
                  color: "#8b5cf6",
                },
                {
                  title: "Audio Lessons",
                  badge: "Audio",
                  desc: "Listen and learn on the go. Every mental model comes with high-quality narration and text-to-speech support.",
                  image: "/features/audio.png",
                  color: "#a855f7",
                },
              ].map((page, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="overflow-hidden rounded-xl px-2.5 transition-transform duration-500 hover:scale-[1.02]" style={{ boxShadow: `-2px 0 0 0 ${page.color}40, 2px 0 0 0 ${page.color}40` }}>
                    <img src={page.image} alt={page.title} className="w-full" />
                  </div>
                  <div className="mt-5 px-1">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="h-px w-6" style={{ backgroundColor: page.color }} />
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: page.color }}>
                        {page.badge}
                      </span>
                    </div>
                    <div className="ml-9">
                      <h3 className="text-xl font-black tracking-[-0.02em] text-white/90">
                        {page.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/50">
                        {page.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
        {/* Sample Products Section */}
        <section className="py-32 sm:py-40">
          <SectionHeader
            badge="Library"
            title="Explore the Models"
            accent="Models"
            description="A sneak peek into the cognitive frameworks available."
          />

          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] md:grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-4 md:gap-6">
            {sampleProducts.map((module, idx) => (
              <motion.div initial={{ opacity: 0, y: 5 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} key={module.id}>
                <ModuleCard module={module} />
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/models" className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all duration-300 hover:opacity-90 hover:shadow-xl hover:shadow-white/10">
              View All Frameworks <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="features" className="w-full py-32 sm:py-40">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <SectionHeader
              badge="How It Works"
              title="Learn Through Interactive Maps"
              accent="Interactive Maps"
              description="Each topic is a learning path. Each path is a map of connected nodes — with short lessons, audio, quizzes, and action steps."
            />

            <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
              {[
                { icon: Map, title: "Pick a Path", desc: "Choose a topic and enter an interactive learning map. Each map is a curated path of connected nodes — designed to take you from zero to fluent.", features: ["Curated learning paths", "Visual node-based maps", "Connected topic networks", "Pick up where you left off"], color: "#3b82f6" },
                { icon: Waypoints, title: "Walk the Nodes", desc: "Each node packs a short lesson, audio narration, quiz, reflection prompt, and action step — so every session is complete and hands-on.", features: ["Short & focused lessons", "Audio for on-the-go learning", "Quizzes to lock it in", "Reflections & action steps"], color: "#10b981" },
                { icon: Brain, title: "Connect & Apply", desc: "See how mental models link together as you progress. Build a lattice of interconnected ideas — and start thinking like the best.", features: ["Visual node connections", "Cross-model linking", "Real-world application guides", "Track your thinking growth"], color: "#8b5cf6" },
              ].map((step, i) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-2xl border border-white/10 bg-[#050505] p-6"
                  >
                    <div className="mb-2 text-xs font-bold uppercase tracking-[0.1em]" style={{ color: step.color }}>
                      Step 0{i + 1}
                    </div>
                    <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]" style={{ color: step.color }}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-heading mb-3 text-2xl font-black text-white/80">
                      {step.title}
                    </h3>
                    <p className="mb-4 text-sm leading-relaxed text-white/40">
                      {step.desc}
                    </p>
                    <ul className="space-y-2">
                      {step.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-white/30">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: step.color, opacity: 0.5 }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="analysis" className="w-full py-32 sm:py-40">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <SectionHeader
              badge="Features"
              title="What's coming to 1section"
              accent="1section"
              description="Every feature is designed to help you collect, connect, and apply mental models effortlessly."
            />

            <div className="grid gap-5 sm:grid-cols-2">
              {[
                { icon: Network, title: "Knowledge Graphs", desc: "Visualize how mental models interconnect. Interactive nodes and edges reveal hidden relationships between every framework in the library.", stat: "Coming in v1.0", color: "#3b82f6" },
                { icon: Headphones, title: "Text-to-Speech Narration", desc: "Listen to any theory with natural TTS narration. Word-level highlighting helps you follow along, perfect for learning on the go.", stat: "Audio for all 200+ models", color: "#10b981" },
                { icon: Sparkles, title: "Daily Free Theory", desc: "A new professional framework unlocks every 24 hours. Build a daily learning habit without commitment, one mental model at a time.", stat: "Refreshes daily", color: "#8b5cf6" },
                { icon: Award, title: "Quizzes & XP System", desc: "Test your understanding with interactive quizzes, earn XP for correct answers, track streaks, and unlock achievements as you progress.", stat: "Gamified learning", color: "#f97316" },
              ].map((card, i) => {
                const Icon = card.icon
                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#050505] p-8 transition-all duration-300 hover:border-white/10"
                  >
                    <div
                      className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-0 transition-all duration-500 group-hover:opacity-100"
                      style={{
                        background: `radial-gradient(circle, ${card.color}15, transparent 60%)`,
                      }}
                    />
                    <div className="relative z-10">
                      <div
                        className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl shadow-lg shadow-black/20"
                        style={{ background: `${card.color}15`, border: `1px solid ${card.color}30`, color: card.color }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-heading mb-2 text-xl font-bold text-white/80">{card.title}</h3>
                      <p className="mb-4 text-sm leading-relaxed text-white/40">{card.desc}</p>
                      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: card.color }}>
                        <span>{card.stat}</span>
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Feedback Section */}
        <section id="feedback" className="w-full py-32 sm:py-40">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mx-auto max-w-3xl"
            >
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#050505] p-10 sm:p-16">
                <div className="pointer-events-none absolute inset-0 -z-10">
                  <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/[0.03] blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/[0.03] blur-3xl" />
                </div>

                <div className="relative z-10 text-center">
                  <div
                    className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg shadow-black/20"
                    style={{ background: "#ffffff10", border: "1px solid #ffffff20", color: "#f97316" }}
                  >
                    <Lightbulb className="h-7 w-7" />
                  </div>

                  {!user ? (
                    <>
                      <SectionHeader
                        badge="Feedback"
                        title="Have a Feature Idea?"
                        accent="Idea?"
                        description="Your feedback shapes 1section. Tell us what you'd love to see."
                        className="mb-0"
                      />
                      <div className="mt-10">
                        <Link
                          href="/login"
                          className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all duration-300 hover:opacity-90 hover:shadow-xl hover:shadow-white/10"
                        >
                          Login to Submit Feedback
                        </Link>
                      </div>
                    </>
                  ) : feedbackSubmitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.05]">
                        <Send className="h-6 w-6 text-white/25" />
                      </div>
                      <p className="font-heading text-lg font-bold">Thank you!</p>
                      <p className="mt-1 text-sm text-white/40">
                        Your feedback has been received. Our team will review it.
                      </p>
                      <button
                        onClick={() => {
                          setFeedbackSubmitted(false)
                          setFeedbackText("")
                        }}
                        className="mt-6 text-sm text-white/30 underline-offset-4 hover:underline"
                      >
                        Submit another
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      <SectionHeader
                        badge="Feedback"
                        title="Have a Feature Idea?"
                        accent="Idea?"
                        description="Your feedback shapes 1section. Tell us what you'd love to see."
                        className="mb-0"
                      />
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault()
                          if (!feedbackText.trim()) return
                          setFeedbackLoading(true)
                          try {
                            await reviewsApi.create({ rating: 5, comment: `FEEDBACK: ${feedbackText.trim()}` })
                            setFeedbackSubmitted(true)
                          } catch {
                            console.error("Failed to submit feedback")
                          } finally {
                            setFeedbackLoading(false)
                          }
                        }}
                        className="mx-auto mt-10 max-w-lg"
                      >
                        <textarea
                          placeholder="Tell us your idea or suggestion..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          required
                          rows={5}
                          className="w-full resize-none rounded-xl border border-white/10 bg-[#030303] px-5 py-3.5 text-sm text-white/90 placeholder:text-white/20 outline-none transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/10"
                        />
                        <div className="mt-4 flex justify-center">
                          <button
                            type="submit"
                            disabled={feedbackLoading}
                            className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all duration-300 hover:opacity-90 hover:shadow-xl hover:shadow-white/10 disabled:opacity-50"
                          >
                            <Send className="h-4 w-4" />
                            {feedbackLoading ? "Sending..." : "Send Feedback"}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full py-32 sm:py-40 overflow-hidden">
          <SectionHeader
            badge="Testimonials"
            title="What Learners Say"
            accent="Say"
            description="Join thousands who have transformed their thinking."
          />

          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-[100px] bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-[100px] bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

            <Marquee pauseOnHover speed={50} className="mb-6">
              {[
                { name: "Sarah Chen", role: "Product Manager at Stripe", text: "1section has completely changed how I approach problem-solving. The mental models are incredibly practical.", color: '#a78bfa' },
                { name: "Marcus Webb", role: "Startup Founder", text: "I finally understand the frameworks that took years to learn. The interactive path makes it stick.", color: '#fb923c' },
                { name: "Elena Rodriguez", role: "Software Engineer at Google", text: "The knowledge graph feature is brilliant. It shows how everything connects.", color: '#2dd4bf' },
                { name: "James Liu", role: "Strategy Consultant", text: "My clients are amazed at how quickly I break down complex problems now.", color: '#fbbf24' },
                { name: "Priya Sharma", role: "Head of Design at Figma", text: "Finally, a platform that makes cognitive frameworks actually fun to learn.", color: '#f472b6' },
                { name: "David Park", role: "Serial Entrepreneur", text: "Worth every penny. The lifetime access was the best investment I made this year.", color: '#38bdf8' },
              ].map((testimonial, idx) => (
                <div key={idx} className="min-w-[360px] max-w-[360px] bg-[#080808] border border-white/5 rounded-2xl p-8 flex flex-col transition-all duration-300 hover:border-white/10 hover:-translate-y-1 ml-6">
                  <Quote size={24} className="text-[#222] mb-4" />
                  <p className="text-base text-[#888] leading-relaxed mb-6 flex-grow">"{testimonial.text}"</p>
                  <div className="flex items-center gap-4 border-t border-white/5 pt-5">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[0.875rem] flex-shrink-0" style={{ background: `${testimonial.color}15`, color: testimonial.color }}>
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-bold text-white text-[0.9375rem]">{testimonial.name}</div>
                      <div className="text-[0.75rem] text-[#555]">{testimonial.role}</div>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="#ffb800" color="#ffb800" />)}
                    </div>
                  </div>
                </div>
              ))}
            </Marquee>

            <Marquee direction="right" pauseOnHover speed={50}>
              {[
                { name: "Aisha Mohammed", role: "VP of Marketing", text: "The collection feature helps me revisit frameworks exactly when I need them.", color: '#a3e635' },
                { name: "Thomas Berg", role: "CFO at TechCorp", text: "My decision-making improved dramatically after just 2 weeks.", color: '#60a5fa' },
                { name: "Yuki Tanaka", role: "Research Scientist", text: "Best tool for building systematic thinking I've ever used.", color: '#f9a8d4' },
                { name: "Alex Rivera", role: "Engineering Lead", text: "The TTS feature is a game changer for my commute learning.", color: '#34d399' },
              ].map((testimonial, idx) => (
                <div key={idx} className="min-w-[360px] max-w-[360px] bg-[#080808] border border-white/5 rounded-2xl p-8 flex flex-col transition-all duration-300 hover:border-white/10 hover:-translate-y-1 ml-6">
                  <Quote size={24} className="text-[#222] mb-4" />
                  <p className="text-base text-[#888] leading-relaxed mb-6 flex-grow">"{testimonial.text}"</p>
                  <div className="flex items-center gap-4 border-t border-white/5 pt-5">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[0.875rem] flex-shrink-0" style={{ background: `${testimonial.color}15`, color: testimonial.color }}>
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-bold text-white text-[0.9375rem]">{testimonial.name}</div>
                      <div className="text-[0.75rem] text-[#555]">{testimonial.role}</div>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="#ffb800" color="#ffb800" />)}
                    </div>
                  </div>
                </div>
              ))}
            </Marquee>
          </div>
        </section>

        {/* Upgrade CTA */}
        {(!user || user.subscriptionStatus === "FREE") && (
        <section id="pricing" className="w-full py-32 sm:py-40">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-1.5 text-[#ffb800] bg-[#ffb8001a] px-4 py-2 rounded-full">
              <Crown size={14} />
              <span className="text-[0.75rem] font-bold uppercase tracking-wider">Unlock Full Access</span>
            </div>
          </div>
          <SectionHeader
            badge="Pricing"
            title="Invest in Your Mind"
            accent="Mind"
            description="Mental models, reimagined as interactive stories."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 mb-12 max-w-5xl mx-auto border border-white/[0.06] rounded-2xl overflow-hidden">
            {[
              { icon: Library, title: "Learn through 100+ real stories.", desc: "Every mental model comes alive through stories you'll actually remember." },
              { icon: Waypoints, title: "Fresh stories, updated 3x daily.", desc: "New content every day so your learning never hits a plateau." },
              { icon: Brain, title: "Branching narratives, not linear chapters.", desc: "Explore different paths through every model — your journey, your pace." },
              { icon: Headphones, title: "Every model in audio and text.", desc: "Listen during your commute or read when you want to go deep." },
              { icon: Award, title: "Unlimited notes, reflections, and highlights.", desc: "Capture every insight and build a personal knowledge base that grows with you." },
              { icon: BookOpen, title: "XP, streaks, and progress tracking.", desc: "Turn learning into a habit with gamification that actually motivates." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative p-5 border-b border-r border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:from-white/[0.06] hover:to-white/[0.02] backdrop-blur-sm transition-all duration-500"
              >
                <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(800px_circle_at_50%_-30%,rgba(255,255,255,0.06),transparent_60%)]" />
                <div className="relative flex flex-col gap-2">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.06] backdrop-blur-sm flex items-center justify-center text-white/50 ring-1 ring-white/[0.08]">
                    <item.icon size={16} />
                  </div>
                  <h3 className="text-white/85 font-bold text-sm md:text-base leading-snug">{item.title}</h3>
                  <p className="text-white/30 text-xs md:text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <button
              onClick={handleSubscribe}
              disabled={subscribing !== null}
              className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black rounded-2xl text-lg font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-white/10"
            >
              {subscribing ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <><Crown size={20} />Subscribe Now</>
              )}
            </button>
            <p className="text-white/30 text-[0.75rem] mt-4">Choose Monthly, Yearly, or Lifetime — cancel anytime.</p>
          </motion.div>
          </div>
        </section>
        )}

        {/* FAQ Section */}
        <section id="faq" className="w-full py-32 sm:py-40">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionHeader
              badge="FAQ"
              title="Frequently Asked Questions"
              accent="Questions"
              description="Everything you need to know about 1section."
            />

            <div className="flex flex-col gap-3">
              {[
                { q: "What makes 1section different from other learning platforms?", a: "1section focuses on mental models and cognitive frameworks rather than just information. Our interactive knowledge graph shows how concepts connect, and the implementation paths help you actually apply what you learn." },
                { q: "How does the daily free theory work?", a: "Every 24 hours, we unlock a new professional framework for free. This gives you a taste of our premium content and helps you build a learning habit without any commitment." },
                { q: "Can I access content offline?", a: "Yes! With our paid plans, you can download theories and listen to them offline. Perfect for commute learning or areas with limited connectivity." },
                { q: "How does the knowledge graph work?", a: "As you progress through modules, they appear in your personal knowledge graph showing how different mental models connect. This helps you see the bigger picture and understand relationships between concepts." },
                { q: "Is there a refund policy?", a: "We offer a 30-day money-back guarantee on all paid plans. If you're not satisfied within the first 30 days, just reach out and we'll issue a full refund." },
              ].map((faq, i) => {
                const isOpen = openFaq === i
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-[#050505] transition-colors duration-200 hover:border-white/20"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full p-6 text-left"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-heading text-base font-bold text-white/80">
                          {faq.q}
                        </span>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] transition-colors duration-200">
                          <motion.div
                            animate={{ rotate: isOpen ? 45 : 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="relative h-3 w-3"
                          >
                            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/30" />
                            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/30" />
                          </motion.div>
                        </div>
                      </div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <div className="px-6 pb-6 pt-0">
                            <div className="h-px w-full bg-white/5 mb-4" />
                            <p className="text-sm leading-relaxed text-white/40">{faq.a}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
