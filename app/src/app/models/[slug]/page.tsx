"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { notFound, useRouter } from "next/navigation";
import React from "react";
import { ReactFlow, Handle, Position, type Node, type Edge, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useModule } from "@/lib/query-hooks";
import { favoritesApi } from "@/lib/api/favorites";
import { reviewsApi } from "@/lib/api/reviews";
import { useAuth } from "@/lib/auth-context";
import { BookOpen, Headphones, HelpCircle, MessageSquare, ArrowLeft, Heart, Star, X, Loader2, Share2, Download } from "lucide-react";
import { getSlides, type Slide } from "@/lib/course-content";
import debounce from "lodash.debounce";
import type { ReactFlowNode, ReactFlowEdge } from "@/lib/types";

interface CustomNodeData {
  label: string;
  description?: string;
  content?: string[];
  isCompleted?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  showTooltip?: boolean;
  nodeSlug?: string;
  slug?: string;
  onAudio?: () => void;
}

const CustomNode = ({ data }: { data: CustomNodeData; id: string }) => {
  return (
    <div className="relative">
      {data.showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-bg-elevated/10 backdrop-blur-[3px] border border-border/60 shadow-lg shadow-black/20 w-[180px] sm:w-[220px] pointer-events-none">
          <div className="text-[10px] text-muted/90 leading-[1.6]">{data.description || "This section covers the key concepts and practical steps needed to understand and apply this topic."}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-bg-elevated/10 border-r border-b border-border/60 rotate-45 -mt-[3px]" />
        </div>
      )}

      <div className={`rounded-lg px-3 py-2 text-[10px] font-bold text-center whitespace-nowrap transition-all duration-200 ${
        data.isCompleted
          ? 'bg-green-950 border border-green-500 text-green-400'
          : data.highlighted
            ? 'bg-bg/90 text-fg border border-fg/40 shadow-[0_0_14px_rgba(255,255,255,0.2)]'
            : data.dimmed
              ? 'bg-bg/40 text-muted-dark border border-border opacity-25'
              : 'bg-bg/90 text-fg border border-border backdrop-blur-[3px]'
      }`}>
        <Handle type="target" position={Position.Top} className="!bg-muted-dark !border-0 !w-1.5 !h-1.5" isConnectable={false} />
        {data.label}
        <Handle type="source" position={Position.Bottom} className="!bg-muted-dark !border-0 !w-1.5 !h-1.5" isConnectable={false} />
      </div>
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export default function PathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { data: module, isLoading } = useModule(slug);

  const rf = useRef<ReactFlowInstance | null>(null);
  const selectedId = useRef<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<{id: string; data: CustomNodeData} | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    setIsFavorited(module?.isFavorited ?? false);
  }, [module?.isFavorited]);

  const debouncedFav = useMemo(() => debounce(async (favorite: boolean) => {
    try {
      if (favorite) await favoritesApi.add(slug);
      else await favoritesApi.remove(slug);
    } catch {
      setIsFavorited(!favorite);
    }
  }, 500), [slug]);

  const toggleFavorite = useCallback(() => {
    if (!user) { router.push("/login"); return; }
    const next = !isFavorited;
    setIsFavorited(next);
    debouncedFav(next);
  }, [isFavorited, debouncedFav, user, router]);

  useEffect(() => () => debouncedFav.cancel(), [debouncedFav]);

  const shareModule = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: module?.title || "", url });
    } else {
      navigator.clipboard.writeText(url);
    }
  }, [module?.title]);

  const downloadPdf = useCallback(() => {
    if (!module) return;
    const allSlides = getSlides(module.nodes);
    const grouped: Record<string, Slide[]> = {};
    for (const s of allSlides) {
      if (!grouped[s.nodeLabel]) grouped[s.nodeLabel] = [];
      grouped[s.nodeLabel].push(s);
    }
    const slidesHtml = Object.entries(grouped).map(([label, slides]) => `
      <div style="margin-bottom:24px;page-break-inside:avoid">
        <h2 style="font-size:16px;color:#333;margin:0 0 8px">${label}</h2>
        ${slides.map(s => `<p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 6px">${s.content}</p>`).join('')}
      </div>
    `).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${module.title}</title>
        <style>
          body { font-family: Georgia,'Times New Roman',serif; max-width:700px; margin:40px auto; padding:0 20px; }
          h1 { font-size:24px; color:#111; margin-bottom:4px; }
          .desc { font-size:14px; color:#666; margin-bottom:32px; }
          hr { border:none; border-top:1px solid #eee; margin:24px 0; }
        </style>
      </head>
      <body>
        <h1>${module.title}</h1>
        <p class="desc">${module.description}</p>
        <hr />
        ${slidesHtml}
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }, [module]);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const selectedVoiceRef = useRef<string>('');

  useEffect(() => {
    const synth = window.speechSynthesis;
    synthRef.current = synth;
    const load = () => {
      const all = synth.getVoices();
      const priority = ['William', 'Aria', 'Guy', 'Jenny', 'Ryan', 'Sonia', 'Andrew', 'Ava'];
      const matched: SpeechSynthesisVoice[] = [];
      for (const name of priority) {
        const found = all.find(v => v.lang.startsWith('en') && v.name.includes(name));
        if (found) matched.push(found);
      }
      voicesRef.current = matched;
      if (matched.length > 0 && !selectedVoiceRef.current) {
        selectedVoiceRef.current = matched[0].name;
      }
    };
    load();
    synth.addEventListener('voiceschanged', load);
    return () => {
      synth.cancel();
      synth.removeEventListener('voiceschanged', load);
    };
  }, []);

  const speakText = useCallback((text: string) => {
    const synth = synthRef.current;
    if (!synth || !text) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    if (selectedVoiceRef.current) {
      const voice = voicesRef.current.find(v => v.name === selectedVoiceRef.current);
      if (voice) utterance.voice = voice;
    }
    utterance.rate = 1;
    utterance.volume = 1;
    synth.speak(utterance);
  }, []);

  const defaultNodes = useMemo(() => {
    if (!module) return [];
    return module.nodes.map((n: ReactFlowNode) => ({
      ...n,
      data: {
        ...n.data,
        slug: module.slug,
        onAudio: () => {
          const title = n.data?.label || '';
          const desc = n.data?.description || '';
          speakText(`${title}. ${desc}`);
        },
      },
    }));
  }, [module, speakText]);

  const defaultEdges = useMemo(() => {
    if (!module) return [];
    return module.edges.map((e: ReactFlowEdge) => ({
      ...e,
      animated: true,
      style: { stroke: 'var(--color-border)', strokeWidth: 3, opacity: 1 },
      labelStyle: { fill: 'var(--color-muted-dark)', fontSize: 9, fontWeight: 500 },
      labelBgStyle: { fill: 'transparent' },
      labelBgPadding: [0, 0] as [number, number],
      labelBgBorderRadius: 0,
    }));
  }, [module]);

  const highlightNodes = useCallback((nodeId: string | null) => {
    const instance = rf.current;
    if (!instance || !module) return;

    if (nodeId) {
      const node = module.nodes.find((n: ReactFlowNode) => n.id === nodeId);
      if (node) {
        const title = node.data?.label || '';
        const desc = node.data?.description || "This section covers the key concepts and practical steps needed to understand and apply this topic.";
        const text = `${title}. ${desc}`;
        speakText(text);
      }
    } else {
      synthRef.current?.cancel();
    }

    const cNodes = !nodeId ? null : new Set<string>([nodeId]);
    const cEdges = !nodeId ? null : new Set<string>();
    if (nodeId) {
      module.edges.forEach((e: ReactFlowEdge) => {
        if (e.source === nodeId || e.target === nodeId) {
          cEdges!.add(e.id);
          cNodes!.add(e.source);
          cNodes!.add(e.target);
        }
      });
    }

    instance.setNodes((nds: Node[]) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          highlighted: cNodes ? cNodes.has(n.id) : false,
          dimmed: cNodes ? !cNodes.has(n.id) : false,
          showTooltip: nodeId === n.id,
        },
      }))
    );

    instance.setEdges((eds: Edge[]) =>
      eds.map((e) => {
        const connected = cEdges ? cEdges.has(e.id) : false;
        const isReset = !nodeId;
        return {
          ...e,
          style: {
            stroke: isReset ? 'var(--color-border)' : connected ? 'var(--color-border-light)' : 'var(--color-border)',
            strokeWidth: 3,
            opacity: isReset ? 1 : connected ? 1 : 0.12,
          },
          labelStyle: {
            fill: isReset ? 'var(--color-muted-dark)' : connected ? 'var(--color-fg)' : 'var(--color-muted-dark)',
            fontSize: 9,
            fontWeight: isReset ? 500 : connected ? 600 : 500,
          },
        };
      })
    );
  }, [module, speakText]);

  useEffect(() => {
    const inst = rf.current as ReactFlowInstance | null;
    if (inst && defaultNodes.length > 0) {
      setTimeout(() => inst.fitView({ padding: 0.5, duration: 300 }), 100);
    }
  }, [defaultNodes]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const newId = selectedId.current === node.id ? null : node.id;
    selectedId.current = newId;
    setSelectedNode(newId ? { id: node.id, data: node.data as unknown as CustomNodeData } : null);
    highlightNodes(newId);
  }, [highlightNodes]);

  const onPaneClick = useCallback(() => {
    selectedId.current = null;
    setSelectedNode(null);
    highlightNodes(null);
  }, [highlightNodes]);

  if (isLoading) {
    return <div className="w-full h-dvh flex items-center justify-center bg-bg"><div className="w-6 h-6 border-2 border-border border-t-fg rounded-full animate-spin" /></div>;
  }

  if (!module) notFound();

  return (
    <div className="w-full h-full bg-bg relative overflow-hidden">
      <div className="absolute inset-0">
        <ReactFlow
          defaultNodes={defaultNodes}
          defaultEdges={defaultEdges}
          nodeTypes={nodeTypes}
          proOptions={{ hideAttribution: true }}
          onInit={(instance) => { rf.current = instance as unknown as ReactFlowInstance; }}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ padding: 0.5 }}
        />
      </div>

      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-bg via-bg/80 to-transparent pt-2 pb-2 px-6 text-center pointer-events-none">
        <h1 className="text-3xl font-bold text-fg mt-6 leading-tight pointer-events-auto">{module.title}</h1>
        <p className="text-base text-muted mt-2 pointer-events-auto">Click a node to explore connections</p>
      </div>

      {/* Default button bar (when no node selected) */}
      {!isLoading && !selectedNode && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-1 bg-bg/70 backdrop-blur-md border border-border/50 rounded-xl px-2 py-1.5 shadow-lg">
            <button
              onClick={() => router.push("/models")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted hover:text-fg hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </button>

            <button
              onClick={toggleFavorite}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer hover:bg-white/[0.04]"
              style={{ color: isFavorited ? '#f43f5e' : undefined }}
            >
              <Heart size={12} className={isFavorited ? "fill-red-500 text-red-500" : "text-muted"} />
              <span style={{ color: isFavorited ? '#f43f5e' : undefined }} className={!isFavorited ? "text-muted" : ""}>
                {isFavorited ? "Saved" : "Like"}
              </span>
            </button>

            <button
              onClick={shareModule}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted hover:text-fg hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              Share
            </button>

            <button
              onClick={() => user ? setShowReview(true) : router.push("/login")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted hover:text-fg hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <Star className="w-3 h-3" />
              Review
            </button>

            <button
              onClick={downloadPdf}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted hover:text-fg hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <Download className="w-3 h-3" />
              PDF
            </button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3"
          >
            {/* Node content preview */}
            {selectedNode.data.content && selectedNode.data.content.length > 0 && (
              <motion.div
                variants={{
                  hidden: { y: 20, opacity: 0, scale: 0.9 },
                  visible: { y: 0, opacity: 1, scale: 1 }
                }}
                className="max-w-[400px] bg-bg/80 backdrop-blur-md border border-border/60 rounded-xl px-4 py-3 shadow-lg"
              >
                <p className="text-[11px] text-muted leading-relaxed line-clamp-3">
                  {selectedNode.data.content[0]}
                </p>
              </motion.div>
            )}

            <div className="flex items-center justify-center gap-2">
              <motion.button
                variants={{
                  hidden: { y: 20, opacity: 0, scale: 0.9 },
                  visible: { y: 0, opacity: 1, scale: 1 }
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={() => router.push(`/models/${slug}/read/${selectedNode.data.nodeSlug}`)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-fg border border-border/60 bg-bg/40 transition-all"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Read</span>
              </motion.button>
              <motion.button
                variants={{
                  hidden: { y: 20, opacity: 0, scale: 0.9 },
                  visible: { y: 0, opacity: 1, scale: 1 }
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
                onClick={() => router.push(`/models/${slug}/audio/${selectedNode.data.nodeSlug}`)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-fg border border-border/60 bg-bg/40 transition-all"
              >
                <Headphones className="w-3.5 h-3.5 shrink-0" />
                <span>Audio</span>
              </motion.button>
              <motion.button
                variants={{
                  hidden: { y: 20, opacity: 0, scale: 0.9 },
                  visible: { y: 0, opacity: 1, scale: 1 }
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.2 }}
                onClick={() => user ? router.push(`/models/${slug}/reflection/${selectedNode.data.nodeSlug}`) : router.push("/login")}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-fg border border-border/60 bg-bg/40 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Reflect</span>
              </motion.button>
              <motion.button
                variants={{
                  hidden: { y: 20, opacity: 0, scale: 0.9 },
                  visible: { y: 0, opacity: 1, scale: 1 }
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.3 }}
                onClick={() => user ? router.push(`/models/${slug}/quiz/${selectedNode.data.nodeSlug}`) : router.push("/login")}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-fg border border-border/60 bg-bg/40 transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Quiz</span>
              </motion.button>
            </div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* Review popup */}
      {showReview && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowReview(false)}
        >
          <div
            className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-fg">Review Module</h3>
              <button
                onClick={() => setShowReview(false)}
                className="p-1 rounded-md text-muted-dark hover:text-fg hover:bg-bg-elevated transition-colors cursor-pointer bg-transparent border-none"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[0.75rem] text-muted mb-4">Rate your experience with this module</p>

            <div className="flex items-center gap-1 mb-5 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="bg-transparent border-none cursor-pointer p-1 transition-all hover:scale-110"
                >
                  <Star
                    size={24}
                    className={star <= reviewRating ? "fill-[#fbbf24] text-[#fbbf24]" : "text-border/60"}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your thoughts (optional)..."
              rows={3}
              className="w-full resize-none bg-bg border border-border-subtle rounded-xl p-3 text-[0.8125rem] text-fg outline-none focus:border-border transition-colors placeholder:text-muted-dark mb-4"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReview(false)}
                className="flex-1 px-4 py-2 rounded-lg text-[0.75rem] font-semibold text-muted hover:text-fg transition-colors cursor-pointer bg-transparent border-none"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (reviewRating === 0) return;
                  setReviewSubmitting(true);
                  try {
                    await reviewsApi.create({ moduleSlug: slug, rating: reviewRating, comment: reviewComment.trim() || undefined });
                    setShowReview(false);
                    setReviewRating(0);
                    setReviewComment("");
                  } catch {}
                  setReviewSubmitting(false);
                }}
                disabled={reviewRating === 0 || reviewSubmitting}
                className="flex-1 px-4 py-2 rounded-lg text-[0.75rem] font-semibold bg-fg text-bg hover:opacity-90 transition-all cursor-pointer border-none disabled:opacity-30 flex items-center justify-center gap-1.5"
              >
                {reviewSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
