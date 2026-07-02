"use client";

import { useMemo } from "react";
import { ReactFlow, Background, Handle, Position, ReactFlowProvider, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const COLORS: Record<string, { label: string; color: string }> = {
  mindset: { label: "Mindset", color: "#a78bfa" },
  clarity: { label: "Clarity", color: "#38bdf8" },
  habit: { label: "Habit", color: "#34d399" },
  action: { label: "Action", color: "#fb923c" },
  strategy: { label: "Strategy", color: "#f472b6" },
  decision: { label: "Decision", color: "#fbbf24" },
  communication: { label: "Communication", color: "#a3e635" },
};

interface RawNode {
  id: string;
  label: string;
  category: string;
  x: number;
  y: number;
}

const RAW_NODES: RawNode[] = [
  { id: "center", label: "Your Mind", category: "mindset", x: 360, y: 300 },
  { id: "growth", label: "Growth Mindset", category: "mindset", x: 185, y: 163 },
  { id: "abundance", label: "Abundance", category: "mindset", x: 85, y: 250 },
  { id: "beginners", label: "Beginner's Mind", category: "mindset", x: 260, y: 225 },
  { id: "first-principles", label: "First Principles", category: "clarity", x: 535, y: 150 },
  { id: "occam", label: "Occam's Razor", category: "clarity", x: 610, y: 238 },
  { id: "inversion", label: "Inversion", category: "clarity", x: 472, y: 238 },
  { id: "expected-value", label: "Expected Value", category: "decision", x: 660, y: 350 },
  { id: "regret-min", label: "Regret Minimization", category: "decision", x: 610, y: 437 },
  { id: "bayesian", label: "Bayesian Thinking", category: "decision", x: 547, y: 337 },
  { id: "pareto", label: "Pareto Principle", category: "action", x: 535, y: 525 },
  { id: "parkinsons", label: "Parkinson's Law", category: "action", x: 447, y: 562 },
  { id: "atomic", label: "Atomic Habits", category: "habit", x: 210, y: 537 },
  { id: "compound", label: "Compound Effect", category: "habit", x: 98, y: 475 },
  { id: "implementation", label: "Implementation Intentions", category: "habit", x: 298, y: 487 },
  { id: "ooda", label: "OODA Loop", category: "strategy", x: 60, y: 387 },
  { id: "second-order", label: "2nd-Order Thinking", category: "strategy", x: 148, y: 350 },
  { id: "socratic", label: "Socratic Method", category: "communication", x: 335, y: 94 },
  { id: "circle-competence", label: "Circle of Competence", category: "communication", x: 460, y: 106 },
];

const CROSS_EDGES: [string, string][] = [
  ["growth", "atomic"],
  ["first-principles", "bayesian"],
  ["pareto", "expected-value"],
  ["ooda", "pareto"],
  ["second-order", "inversion"],
  ["socratic", "first-principles"],
  ["abundance", "beginners"],
  ["regret-min", "expected-value"],
  ["occam", "inversion"],
  ["compound", "parkinsons"],
  ["ooda", "growth"],
  ["growth", "compound"],
  ["implementation", "atomic"],
];

const GraphNode = ({ data }: { data: { label: string; color: string; isCenter?: boolean } }) => {
  if (data.isCenter) {
    return (
      <div className="flex flex-col items-center select-none">
        <div
          className="w-[100px] h-[100px] rounded-full flex items-center justify-center text-[13px] font-black tracking-tight leading-tight animate-pulse"
          style={{
            background: "radial-gradient(circle at 35% 35%, #fff 0%, #e0e0e0 100%)",
            boxShadow: "0 0 40px rgba(255,255,255,0.15), 0 0 80px rgba(255,255,255,0.06)",
            color: "#050505",
          }}
        >
          Your
          <br />
          Mind
        </div>
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
      </div>
    );
  }

  return (
    <div className="select-none group">
      <div
        className="backdrop-blur-sm bg-[#0a0a0a]/80 border rounded-xl px-4 py-2.5 text-[13px] font-bold text-white/90 text-center leading-tight whitespace-nowrap transition-all duration-300"
        style={{
          borderColor: `${data.color}30`,
          boxShadow: `0 0 18px ${data.color}08`,
        }}
      >
        <div className="flex items-center gap-1.5 justify-center">
          <div
            className="w-[7px] h-[7px] rounded-full shrink-0"
            style={{
              background: data.color,
              boxShadow: `0 0 8px ${data.color}`,
            }}
          />
          <span>{data.label}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <Handle type="target" position={Position.Top} className="!opacity-0" />
    </div>
  );
};

const nodeTypes = { graphNode: GraphNode };

export default function KnowledgeGraph() {
  const nodes: Node[] = useMemo(
    () =>
      RAW_NODES.map((n) => ({
        id: n.id,
        type: "graphNode",
        position: { x: n.x, y: n.y },
        data: {
          label: n.label,
          color: COLORS[n.category].color,
          isCenter: n.id === "center",
        },
      })),
    []
  );

  const edges: Edge[] = useMemo(
    () => [
      ...RAW_NODES.filter((n) => n.id !== "center").map((n) => ({
        id: `e-center-${n.id}`,
        source: "center",
        target: n.id,
        animated: true,
        style: { stroke: "rgba(255,255,255,0.3)", strokeWidth: 2.5, strokeDasharray: "6,4" },
      })),
      ...CROSS_EDGES.map(([s, t], i) => ({
        id: `e-cross-${i}`,
        source: s,
        target: t,
        animated: true,
        style: { stroke: "rgba(255,255,255,0.15)", strokeWidth: 2, strokeDasharray: "4,3" },
      })),
    ],
    []
  );

  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          proOptions={{ hideAttribution: true }}
          fitView
          fitViewOptions={{ padding: 0.1, duration: 300 }}
          minZoom={0.3}
          maxZoom={2}
          panOnDrag={false}
          zoomOnScroll={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background color="#ffffff06" gap={24} size={0.5} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
