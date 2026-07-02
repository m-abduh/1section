"use client";

import { useMemo, useState, useCallback } from "react";
import { X } from "lucide-react";
import {
  ReactFlow,
  Handle,
  Position,
  ReactFlowProvider,
  type NodeProps,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface NodeForm {
  id: string;
  positionX: number;
  positionY: number;
  label: string;
  type: string;
}

interface EdgeForm {
  id: string;
  source: string;
  target: string;
  label: string;
  animated: boolean;
}

const CustomNode = ({ data }: NodeProps) => {
  const d = data as Record<string, unknown>;
  return (
    <div className="relative">
      <div className={`rounded-lg px-3 py-2 text-[10px] font-bold text-center whitespace-nowrap transition-all duration-200 ${
        d.selected
          ? 'bg-white/15 text-white border border-white/30 shadow-[0_0_14px_rgba(255,255,255,0.15)]'
          : d.dimmed
            ? 'bg-[#0d0d0d]/40 text-white/25 border border-white/[0.04] opacity-40'
            : 'bg-[#0d0d0d]/90 text-white border border-white/[0.08] backdrop-blur-sm shadow-lg shadow-black/20'
      }`}>
        <Handle type="target" position={Position.Top} className="!bg-[#555] !border-0 !w-1.5 !h-1.5" />
        {d.label as string}
        <Handle type="source" position={Position.Bottom} className="!bg-[#555] !border-0 !w-1.5 !h-1.5" />
      </div>
      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[#0d0d0d]/90 backdrop-blur-md border border-white/[0.08] shadow-lg shadow-black/40 transition-opacity duration-150 pointer-events-none w-[260px] sm:w-[360px] ${
        d.selected ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="text-[10px] text-white/60 leading-relaxed">{(d.description as string) || (d.desc as string) || "No description available."}</div>
      </div>
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

function Graph({ nodes, edges, nodeList, onNodesChange, edgeList, onEdgesChange }: {
  nodes: Node[];
  edges: Edge[];
  nodeList?: NodeForm[];
  onNodesChange?: (nodes: NodeForm[]) => void;
  edgeList?: EdgeForm[];
  onEdgesChange?: (edges: EdgeForm[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const styledNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        type: "custom" as const,
        data: {
          ...n.data,
          selected: selectedId === n.id,
          dimmed: selectedId !== null && selectedId !== n.id,
        },
      })),
    [nodes, selectedId]
  );

  const styledEdges = useMemo(
    () =>
      edges.map((e) => {
        const connected = selectedId
          ? e.source === selectedId || e.target === selectedId
          : false;
        return {
          ...e,
          animated: true,
          style: {
            stroke: connected ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)",
            strokeWidth: connected ? 3 : 2,
            opacity: selectedId ? (connected ? 1 : 0.15) : 1,
          },
          labelStyle: {
            fill: connected ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.35)",
            fontSize: 9,
            fontWeight: connected ? 600 : 500,
          },
          labelBgStyle: { fill: "transparent" },
          labelBgPadding: [0, 0] as [number, number],
          labelBgBorderRadius: 0,
        };
      }),
    [edges, selectedId]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
    setSelectedId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedId(null);
  }, []);

  const selectedFormNode = selectedId && onNodesChange
    ? nodeList?.find((n) => n.id === selectedId)
    : null;

  const connectedEdges = selectedId && onEdgesChange && edgeList
    ? edgeList.filter((e) => e.source === selectedId || e.target === selectedId)
    : [];

  const updateNodeField = useCallback((id: string, field: "label" | "description", value: string) => {
    if (!onNodesChange || !nodeList) return;
    onNodesChange(
      nodeList.map((n) => (n.id === id ? { ...n, [field]: value } : n))
    );
  }, [onNodesChange, nodeList]);

  const updateEdgeLabel = useCallback((id: string, value: string) => {
    if (!onEdgesChange || !edgeList) return;
    onEdgesChange(
      edgeList.map((e) => (e.id === id ? { ...e, label: value } : e))
    );
  }, [onEdgesChange, edgeList]);

  const deleteEdge = useCallback((id: string) => {
    if (!onEdgesChange || !edgeList) return;
    onEdgesChange(edgeList.filter((e) => e.id !== id));
  }, [onEdgesChange, edgeList]);

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.3, duration: 300 }}
        minZoom={0.3}
        maxZoom={2.5}
        panOnDrag={true}
        zoomOnScroll={true}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
      />

      {selectedFormNode && (
        <div className="absolute bottom-3 left-3 right-3 z-10 bg-[#0d0d0d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl p-4 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Node Properties</span>
            <span className="text-[9px] font-mono text-white/20">{selectedFormNode.id}</span>
          </div>
          <div className="space-y-2.5">
            <input
              value={selectedFormNode.label}
              onChange={(e) => updateNodeField(selectedFormNode.id, "label", e.target.value)}
              placeholder="Node label"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/20 transition-all placeholder:text-white/20"
            />
            <input
              value={(selectedFormNode as any).description || ""}
              onChange={(e) => updateNodeField(selectedFormNode.id, "description", e.target.value)}
              placeholder="Node description"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/70 outline-none focus:border-white/20 transition-all placeholder:text-white/20"
            />
            {connectedEdges.length > 0 && (
              <div className="pt-2 border-t border-white/[0.06]">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2 block">Connected Edges</span>
                <div className="space-y-2">
                  {connectedEdges.map((e) => (
                    <div key={e.id} className="flex items-center gap-1.5">
                      <span className="text-[9px] text-white/20 font-mono shrink-0">
                        {e.source}→{e.target}
                      </span>
                      <input
                        value={e.label || ""}
                        onChange={(ev) => updateEdgeLabel(e.id, ev.target.value)}
                        placeholder="Edge label"
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white/70 outline-none focus:border-white/20 transition-all placeholder:text-white/20"
                      />
                      <button
                        onClick={() => deleteEdge(e.id)}
                        className="text-white/20 hover:text-red-400 transition-all shrink-0"
                        title="Delete edge"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModuleGraph({
  nodes,
  edges,
  nodeList,
  onNodesChange,
  edgeList,
  onEdgesChange,
}: {
  nodes: Node[];
  edges: Edge[];
  nodeList?: NodeForm[];
  onNodesChange?: (nodes: NodeForm[]) => void;
  edgeList?: EdgeForm[];
  onEdgesChange?: (edges: EdgeForm[]) => void;
}) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="h-[400px] relative">
        <ReactFlowProvider>
          <Graph nodes={nodes} edges={edges || []} nodeList={nodeList} onNodesChange={onNodesChange} edgeList={edgeList} onEdgesChange={onEdgesChange} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
