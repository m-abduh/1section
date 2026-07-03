"use client";

import React, { useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Headphones, BookOpen, Star, Lock, Maximize2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ReactFlow, Handle, Position, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { favoritesApi } from "@/lib/api/favorites";
import { useAuth } from "@/lib/auth-context";

interface ModuleData {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  nodes?: any[];
  edges?: any[];
  isFavorited?: boolean;
  isPremium?: boolean;
  isDailyFree?: boolean;
  listenMin?: number;
  readMin?: number;
}

const CustomNode = ({ data }: any) => (
  <div className="bg-bg-card/90 text-fg border border-border-light rounded-lg px-3 py-2 text-[10px] font-bold text-center whitespace-nowrap backdrop-blur-sm">
    <Handle type="target" position={Position.Top} className="!bg-muted-dark !border-0 !w-1.5 !h-1.5" />
    {data.label}
    <Handle type="source" position={Position.Bottom} className="!bg-muted-dark !border-0 !w-1.5 !h-1.5" />
  </div>
);

const nodeTypes = { custom: CustomNode };

const FlowAutoFit = React.memo(({ nodes, edges, resetRef, panEnabled }: { nodes: any[]; edges: any[]; resetRef: React.MutableRefObject<((zoom?: boolean) => void) | null>; panEnabled: boolean }) => {
  const { fitView } = useReactFlow();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ nodes: [{ id: nodes[0]?.id }], padding: 0.2, duration: 0, minZoom: 0.6, maxZoom: 1.2 });
    }, 100);
    return () => clearTimeout(timer);
  }, [fitView, nodes]);

  React.useEffect(() => {
    resetRef.current = (zoom?: boolean) => {
      if (zoom) fitView({ padding: 0.3, duration: 300 });
      else fitView({ nodes: [{ id: nodes[0]?.id }], padding: 0.2, duration: 300, minZoom: 0.6, maxZoom: 1.2 });
    };
    return () => { resetRef.current = null; };
  }, [fitView, resetRef, nodes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      proOptions={{ hideAttribution: true }}
      defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      fitView
      panOnDrag={panEnabled}
      zoomOnScroll={panEnabled}
      zoomOnDoubleClick={false}
      panOnScroll={false}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      style={{ width: '100%', height: '100%' }}
    >
    </ReactFlow>
  );
});

const MiniPreview = React.memo(({ nodes, edges, resetRef, panEnabled }: { nodes: any[]; edges: any[]; resetRef: React.MutableRefObject<((zoom?: boolean) => void) | null>; panEnabled: boolean }) => {
  const styledNodes = useMemo(() => nodes.map(n => ({
    ...n,
    type: 'custom'
  })), [nodes]);

  const styledEdges = useMemo(() => edges.map(e => ({
    ...e,
    animated: true,
    style: { stroke: 'var(--color-border)', strokeWidth: 3 },
    labelStyle: { fill: 'var(--color-muted-dark)', fontSize: 9, fontWeight: 500 },
    labelBgStyle: { fill: 'transparent' },
    labelBgPadding: [0, 0],
    labelBgBorderRadius: 0,
  })), [edges]);

  return (
    <ReactFlowProvider>
      <FlowAutoFit nodes={styledNodes} edges={styledEdges} resetRef={resetRef} panEnabled={panEnabled} />
    </ReactFlowProvider>
  );
});

export function ModuleCard({ module }: { module: ModuleData }) {
  const router = useRouter();
  const { user } = useAuth();
  const durations = { listenMin: module.listenMin ?? 0, readMin: module.readMin ?? 0 };
  const resetRef = useRef<((zoom?: boolean) => void) | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFavorited, setIsFavorited] = useState(module.isFavorited ?? false);

  const isSubscribed = user && user.subscriptionStatus && user.subscriptionStatus !== "FREE";
  const isAccessible = module.isDailyFree || isSubscribed;

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = isFavorited;
    setIsFavorited(!prev);
    try {
      if (prev) {
        await favoritesApi.remove(module.slug);
      } else {
        await favoritesApi.add(module.slug);
      }
    } catch {
      setIsFavorited(prev);
    }
  };

  return (
    <div className="group relative flex flex-col bg-bg-card border border-border-subtle rounded-2xl overflow-hidden transition-all duration-300 hover:bg-bg hover:border-border hover:-translate-y-1 cursor-pointer">
      {!isAccessible && (
        <div className="absolute inset-0 z-20 bg-bg-card/60 backdrop-blur-[2px] flex items-center justify-center">
          <Link href={user ? "/#pricing" : "/login"} className="inline-flex items-center gap-2 px-5 py-2.5 bg-premium text-black rounded-xl font-bold text-[0.8125rem] no-underline hover:bg-premium/90 transition-all">
            <Lock size={14} />
            {user ? "Subscribe to Access" : "Login to Access"}
          </Link>
        </div>
      )}

      <div className="absolute inset-0 z-0" onClick={isZoomed || !isAccessible ? undefined : () => router.push(`/models/${module.slug}`)}>
        {module.nodes && module.nodes.length > 0 ? (
          <MiniPreview nodes={module.nodes} edges={module.edges || []} resetRef={resetRef} panEnabled={isZoomed} />
        ) : (
          <div className="w-full h-full bg-bg-card" />
        )}
      </div>

      <motion.div
        animate={{ opacity: isZoomed ? 0 : 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bg-card via-bg-card/80 to-transparent z-10 pointer-events-none"
      />
      <AnimatePresence>
        {isZoomed && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => { e.stopPropagation(); resetRef.current?.(); setIsZoomed(false); }}
            className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-bg/80 text-fg hover:bg-bg"
          >
            <X size={14} />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        animate={isZoomed ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={isAccessible ? () => router.push(`/models/${module.slug}`) : undefined}
        className="relative z-20 p-4 md:p-8 pb-2 md:pb-3"
        style={{ pointerEvents: isZoomed ? 'none' : 'auto' }}
      >
        <div className="flex items-start justify-between gap-2 md:gap-3">
          <h2 className="text-base md:text-lg font-black text-fg leading-[1.25] line-clamp-2 flex-1">{module.title}</h2>
          <span className="shrink-0 px-2 md:px-3 py-1 rounded-full text-[0.5625rem] md:text-[0.625rem] font-semibold bg-bg-elevated text-muted border border-border mt-1">{module.category ? module.category.charAt(0).toUpperCase() + module.category.slice(1).replace(/-/g, ' ') : ''}</span>
        </div>
        <p className="text-[0.6875rem] md:text-[0.75rem] text-muted leading-relaxed mt-1 line-clamp-2">{module.description}</p>
      </motion.div>

      <div className="flex-1 relative z-10 min-h-[140px] md:min-h-[180px] pointer-events-none" />

      <motion.div
        animate={{ opacity: isZoomed ? 0 : 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-x-0 bottom-0 h-24 md:h-32 bg-gradient-to-t from-bg-card via-bg-card/90 to-transparent z-10 pointer-events-none"
      />

      <motion.div
        animate={isZoomed ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-20 flex items-center justify-between px-4 md:px-8 pb-4 md:pb-6 pt-6 md:pt-8"
        style={{ pointerEvents: isZoomed ? 'none' : 'auto' }}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); resetRef.current?.(true); setIsZoomed(v => !v); }}
            className="p-1.5 rounded-full text-muted hover:text-fg hover:bg-bg-elevated transition-all"
          >
            <Maximize2 size={11} />
          </button>
          {(durations.listenMin > 0 || durations.readMin > 0) && (
            <span className="text-[0.625rem] md:text-[0.6875rem] text-muted flex items-center gap-1.5 md:gap-2">
              <span className="flex items-center gap-1">
                <Headphones size={11} />
                <span className="hidden xl:inline">Listen </span><span>{durations.listenMin}m</span>
              </span>
              <span className="text-muted">·</span>
              <span className="flex items-center gap-1">
                <BookOpen size={11} />
                <span className="hidden xl:inline">Read </span><span>{durations.readMin}m</span>
              </span>
            </span>
          )}
        </div>
        <button
          onClick={toggleFavorite}
          className="p-2 rounded-full text-muted hover:text-premium hover:bg-bg-elevated transition-all"
        >
          <Star size={14} fill={isFavorited ? "#fbbf24" : "none"} stroke={isFavorited ? "#fbbf24" : "currentColor"} />
        </button>
      </motion.div>
    </div>
  );
}
