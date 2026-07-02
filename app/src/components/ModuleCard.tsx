"use client";

import React, { useMemo, useState } from "react";
import { Headphones, BookOpen, Star, Lock } from "lucide-react";
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

const FlowAutoFit = React.memo(({ nodes, edges }: { nodes: any[]; edges: any[] }) => {
  const { fitView } = useReactFlow();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ nodes: [{ id: nodes[0]?.id }], padding: 0.2, duration: 0, minZoom: 0.6, maxZoom: 1.2 });
    }, 100);
    return () => clearTimeout(timer);
  }, [fitView, nodes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      proOptions={{ hideAttribution: true }}
      defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      fitView
    >
    </ReactFlow>
  );
});

const MiniPreview = React.memo(({ nodes, edges }: { nodes: any[]; edges: any[] }) => {
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
      <FlowAutoFit nodes={styledNodes} edges={styledEdges} />
    </ReactFlowProvider>
  );
});

export function ModuleCard({ module }: { module: ModuleData }) {
  const router = useRouter();
  const { user } = useAuth();
  const durations = { listenMin: module.listenMin ?? 0, readMin: module.readMin ?? 0 };
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
    <div
      onClick={() => router.push(`/models/${module.slug}`)}
      className="group relative flex flex-col bg-bg-card border border-border-subtle rounded-2xl overflow-hidden transition-all duration-300 hover:bg-bg hover:border-border hover:-translate-y-1 cursor-pointer"
    >
      {!isAccessible && (
        <div className="absolute inset-0 z-20 bg-bg-card/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Link href="/#pricing" className="inline-flex items-center gap-2 px-5 py-2.5 bg-premium text-black rounded-xl font-bold text-[0.8125rem] no-underline hover:bg-premium/90 transition-all">
            <Lock size={14} />
            Subscribe to Access
          </Link>
        </div>
      )}

      <div className="absolute inset-0 z-0">
        {module.nodes && module.nodes.length > 0 ? (
          <MiniPreview nodes={module.nodes} edges={module.edges || []} />
        ) : (
          <div className="w-full h-full bg-bg-card" />
        )}
      </div>

      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bg-card via-bg-card/80 to-transparent z-10" />

      <div className="relative z-20 p-4 md:p-8 pb-2 md:pb-3">
        <div className="flex items-start justify-between gap-2 md:gap-3">
          <h2 className="text-base md:text-lg font-black text-fg leading-[1.25] line-clamp-2 flex-1">{module.title}</h2>
          <span className="shrink-0 px-2 md:px-3 py-1 rounded-full text-[0.5625rem] md:text-[0.625rem] font-semibold bg-bg-elevated text-muted border border-border mt-1">{module.category ? module.category.charAt(0).toUpperCase() + module.category.slice(1).replace(/-/g, ' ') : ''}</span>
        </div>
        <p className="text-[0.6875rem] md:text-[0.75rem] text-muted leading-relaxed mt-1 line-clamp-2">{module.description}</p>
      </div>

      <div className="flex-1 relative z-10 min-h-[140px] md:min-h-[180px]" />

      <div className="absolute inset-x-0 bottom-0 h-24 md:h-32 bg-gradient-to-t from-bg-card via-bg-card/90 to-transparent z-10" />

      <div className="relative z-20 flex items-center justify-between px-4 md:px-8 pb-4 md:pb-6 pt-6 md:pt-8">
        <div className="flex items-center gap-2 md:gap-3">
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
      </div>
    </div>
  );
}
