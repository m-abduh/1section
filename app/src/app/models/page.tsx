"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import debounce from "lodash.debounce";
import { Play, Clock, Search, Sparkles, Crown, Lock } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ReactFlow, Background, Handle, Position, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ModuleCard } from "@/components/ModuleCard";
import { useModules } from "@/lib/use-modules";
import { useAuth } from "@/lib/auth-context";
import { modulesApi } from "@/lib/api/modules";
import Pagination from "@/components/Pagination";
import type { Module as ModuleType, ReactFlowNode, ReactFlowEdge } from "@/lib/types";


const DisplayNode = ({ data }: { data: any }) => (
  <div className="rounded-lg px-3 py-2 text-[10px] font-bold text-center whitespace-nowrap bg-bg/90 text-fg border border-border backdrop-blur-[3px] cursor-default">
    <Handle type="target" position={Position.Top} className="!bg-muted-dark !border-0 !w-1.5 !h-1.5" isConnectable={false} />
    {data.label}
    <Handle type="source" position={Position.Bottom} className="!bg-muted-dark !border-0 !w-1.5 !h-1.5" isConnectable={false} />
  </div>
);

const displayNodeTypes = { custom: DisplayNode };

const MarketingFlow = ({ nodes: rawNodes, edges: rawEdges }: { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] }) => {
  const styledNodes = React.useMemo(() => rawNodes.map((n) => ({
    id: n.id,
    type: 'custom',
    position: n.position,
    data: n.data,
  })), [rawNodes]);

  const styledEdges = React.useMemo(() => rawEdges.map((e) => ({
    ...e,
    animated: true,
    style: { stroke: 'var(--color-border)', strokeWidth: 3, opacity: 1 },
    labelStyle: { fill: 'var(--color-muted-dark)', fontSize: 9, fontWeight: 500 },
    labelBgStyle: { fill: 'transparent' },
    labelBgPadding: [0, 0] as [number, number],
    labelBgBorderRadius: 0,
  })), [rawEdges]);

  const rfRef = useRef<any>(null);
  const [rfReady, setRfReady] = useState(false);

  useEffect(() => {
    if (rfReady) {
      const timer = setTimeout(() => {
        rfRef.current.fitView({ padding: 0.5, duration: 300 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [rfReady]);

  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <ReactFlow
          nodes={styledNodes}
          edges={styledEdges}
          nodeTypes={displayNodeTypes}
          proOptions={{ hideAttribution: true }}
          onInit={(instance) => { rfRef.current = instance; setRfReady(true); }}
        />
      </ReactFlowProvider>
    </div>
  );
};

export default function ProductsPage() {
  const { user, preferences } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dailyFree, setDailyFree] = useState<ModuleType | null>(null);

  const { modules, categories, historyModules, totalPages, loading, error, fetchHistory } = useModules(
    currentPage,
    selectedCategory,
    debouncedSearch,
  );

  const sortedModules = [...modules].sort((a, b) => {
    const aPref = preferences.includes(a.category) ? 0 : 1;
    const bPref = preferences.includes(b.category) ? 0 : 1;
    return aPref - bPref;
  });

  const historyFetchedRef = useRef(false);

  useEffect(() => {
    modulesApi.getDailyFree().then(setDailyFree).catch(() => {});
  }, []);

  useEffect(() => {
    if (user && !historyFetchedRef.current) {
      historyFetchedRef.current = true;
      fetchHistory();
    }
  }, [user, fetchHistory]);

  const debouncedSetSearch = useMemo(() => debounce((value: string) => setDebouncedSearch(value), 400), []);

  useEffect(() => {
    debouncedSetSearch(searchQuery);
    return () => debouncedSetSearch.cancel();
  }, [searchQuery, debouncedSetSearch]);

  const isSubscribed = user && user.subscriptionStatus && user.subscriptionStatus !== "FREE";

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-10 md:py-16 min-h-[90vh]">
      {/* Knowledge Graph Banner + Daily Material */}
      <div className="mb-8">
        {!isSubscribed && (
          <div className="h-[180px] sm:h-[220px] bg-[#0a0a0c] rounded-3xl border border-white/10 overflow-hidden relative">
            <div className="absolute inset-y-0 right-0 w-1/2 z-0">
              {dailyFree?.nodes && dailyFree.nodes.length > 0 ? (
                <MarketingFlow nodes={dailyFree.nodes} edges={dailyFree.edges} />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[0.75rem] text-white/20" />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] from-30% via-[#0a0a0c]/50 via-55% to-transparent to-75% z-10" />
            <div className="relative z-20 h-full flex items-center p-6 sm:p-8">
              <div className="w-full max-w-[400px]">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white/10 rounded-full text-[0.5625rem] sm:text-[0.6875rem] font-bold text-white/90 uppercase tracking-[0.1em] w-fit">
                    <Sparkles size={10} className="text-[#fbbf24]" />
                    Daily Free
                  </div>
                  <span className="inline-flex shrink-0 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[0.5rem] sm:text-[0.625rem] font-semibold bg-white/5 text-white/70 border border-white/10 w-fit">
                    {dailyFree?.category ? dailyFree.category.charAt(0).toUpperCase() + dailyFree.category.slice(1).replace(/-/g, ' ') : ''}
                  </span>
                </div>
                <h3 className="text-[0.9375rem] sm:text-xl font-bold text-white mb-1 sm:mb-2 leading-snug line-clamp-1 sm:line-clamp-none">
                  {dailyFree?.title ?? 'Loading...'}
                </h3>
                <p className="text-[0.6875rem] sm:text-[0.8125rem] text-[#888] mb-3 sm:mb-5 leading-relaxed line-clamp-1 sm:line-clamp-2">
                  {dailyFree?.description ?? ''}
                </p>
                <Link href={`/models/${dailyFree?.slug ?? '#'}`} className="inline-flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 sm:px-5 sm:py-2.5 bg-white text-black rounded-lg sm:rounded-xl no-underline font-bold text-[0.625rem] sm:text-[0.75rem] hover:bg-white/90 hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-white/20">
                  <Play size={10} fill="currentColor" />
                  <span className="hidden sm:inline">Start Free</span>
                  <span className="sm:hidden">Free</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {historyModules.length > 0 && (
        <section className="mb-16">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-muted mb-2">
              <Clock size={14} />
              <span className="text-[0.75rem] font-bold uppercase tracking-[0.05em]">Continue Learning</span>
            </div>
            <h2 className="text-3xl font-black tracking-[-0.04em]">Your Learning <span className="text-muted-light">History</span></h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {historyModules.map((module, idx) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link href={`/models/${module.slug}`} className="group flex flex-col bg-bg-card border border-border-subtle rounded-xl p-3 sm:p-4 no-underline transition-all duration-300 hover:bg-bg hover:border-border hover:-translate-y-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[0.5rem] sm:text-[0.5625rem] font-semibold bg-bg-elevated text-muted border border-border">{module.category ? module.category.charAt(0).toUpperCase() + module.category.slice(1).replace(/-/g, ' ') : ''}</span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold mb-1 text-fg truncate">{module.title}</h3>
                  <p className="text-[0.6875rem] sm:text-[0.75rem] text-muted-light leading-relaxed mb-2 line-clamp-2">{module.description}</p>
                  {module.progress && (
                    <div className="mb-2 space-y-1">
                      <div className="flex items-center justify-between text-[0.5625rem] sm:text-[0.625rem] text-muted-dark">
                        <span>{module.progress.completedNodes}/{module.progress.totalNodes} nodes</span>
                        <span className="font-semibold text-fg">{Math.round((module.progress.completedNodes / module.progress.totalNodes) * 100)}%</span>
                      </div>
                      <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-fg rounded-full" style={{ width: `${(module.progress.completedNodes / module.progress.totalNodes) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-border-subtle pt-2 mt-auto">
                    <div className="flex items-center gap-1.5 text-[0.625rem] sm:text-[0.6875rem] font-semibold text-muted group-hover:text-fg transition-colors">
                      <Play size={9} className="sm:w-2.5 sm:h-2.5" fill="currentColor" />
                      {module.progress ? "Continue" : "Start"}
                    </div>
                    <span className="text-[0.625rem] sm:text-[0.6875rem] text-muted-dark">
                      {module.progress ? "Recently" : "New"}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <div className="mb-12">
        <div className="mb-5">
          <p className="text-[0.6875rem] font-bold text-muted uppercase tracking-[0.1em] mb-3">Categories</p>

          <div className="flex items-center gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(selectedCategory === cat ? null : cat); setCurrentPage(1); }}
                className={`px-3 py-1.5 md:px-4 md:py-2.5 rounded-full text-[0.625rem] md:text-[0.75rem] font-semibold transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-fg text-bg shadow-lg shadow-fg/10' : 'bg-bg-card border border-border-subtle text-muted-dark hover:border-border-light hover:text-fg'}`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="mt-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[0.625rem] md:text-[0.75rem] font-semibold text-red-400 hover:text-red-300 transition-all whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-dark" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full py-4 pl-11 pr-4 bg-bg-input border border-border rounded-xl text-fg text-[0.875rem] outline-none focus:border-border-light transition-colors placeholder:text-muted-dark"
          />
        </div>
      </div>

      {error && (
        <div className="text-center py-10 text-red-400">{error}</div>
      )}

      {!isSubscribed && sortedModules.length > 0 && (
        <div className="mb-8 p-4 bg-premium/5 border border-premium/20 rounded-xl flex items-center gap-3">
          <Crown size={18} className="text-premium flex-shrink-0" />
          <p className="text-[0.875rem] text-muted">
            Unlock all modules with a subscription.{" "}
            <Link href="/#pricing" className="text-premium font-bold no-underline hover:underline">
              Subscribe
            </Link>
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-border border-t-fg rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-4 md:gap-8">
            {sortedModules.map((module, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={module.id}
              >
                <ModuleCard module={module} />
              </motion.div>
            ))}
          </div>

          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  );
}
