"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Trash2, X } from "lucide-react";

interface EditorNodeData {
  label: string;
  description?: string;
  content?: string[];
}

type NodeFieldValue = string | string[] | undefined;

export interface NodeForm {
  id: string;
  positionX: number;
  positionY: number;
  label: string;
  description?: string;
  content?: string[];
  type: string;
}

export interface EdgeForm {
  id: string;
  source: string;
  target: string;
  label: string;
  animated: boolean;
}

interface Props {
  nodes: NodeForm[];
  edges: EdgeForm[];
  onNodesChange: (nodes: NodeForm[]) => void;
  onEdgesChange: (edges: EdgeForm[]) => void;
  slug: string;
}

function toFlowNode(n: NodeForm): Node {
  return {
    id: n.id,
    position: { x: n.positionX, y: n.positionY },
    data: { label: n.label, description: n.description, content: n.content } satisfies EditorNodeData,
    type: "editor",
  };
}

function toFlowEdge(e: EdgeForm): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: e.animated,
    style: { stroke: "rgba(255,255,255,0.45)", strokeWidth: 2.5 },
  };
}

const EditorNode = ({ data, selected }: NodeProps) => {
  const d = data as unknown as EditorNodeData;
  return (
  <div className="relative">
    <div
      className={`bg-[#0d0d0d]/90 border rounded-lg px-3 py-2 text-[10px] font-bold text-center whitespace-nowrap backdrop-blur-sm shadow-lg shadow-black/20 transition-all ${
        selected ? "border-white/50 ring-1 ring-white/20" : "border-[#333]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#555] !border-0 !w-1.5 !h-1.5" />
      {d.label}
      <Handle type="source" position={Position.Bottom} className="!bg-[#555] !border-0 !w-1.5 !h-1.5" />
    </div>
    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[#0d0d0d]/90 backdrop-blur-md border border-white/[0.08] shadow-lg shadow-black/40 transition-opacity duration-150 pointer-events-none w-[260px] sm:w-[360px] ${
      selected ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="text-[10px] text-white/60 leading-relaxed">{d.description || "No description available."}</div>
    </div>
  </div>
  );
};

const nodeTypes = { editor: EditorNode };

function Flow({ nodes: parentNodes, edges: parentEdges, onNodesChange: notifyNodes, onEdgesChange: notifyEdges, slug }: Props) {
  const rfNodes = useMemo(() => parentNodes.map(toFlowNode), [parentNodes]);
  const rfEdges = useMemo(() => parentEdges.map(toFlowEdge), [parentEdges]);

  const [nodes, setNodes] = useState(rfNodes);
  const [edges, setEdges] = useState(rfEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  useEffect(() => {
    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [rfNodes, rfEdges]);

  const syncNodes = useCallback((updated: Node[]) => {
    notifyNodes(
      updated.map((n) => {
        const d = n.data as unknown as EditorNodeData;
        return {
          id: n.id,
          positionX: n.position.x,
          positionY: n.position.y,
          label: d.label || "",
          description: d.description || undefined,
          content: d.content || undefined,
          type: "custom",
        };
      })
    );
  }, [notifyNodes]);

  const syncEdges = useCallback((updated: Edge[]) => {
    notifyEdges(
      updated.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: typeof e.label === "string" ? e.label : "",
        animated: e.animated ?? true,
      }))
    );
  }, [notifyEdges]);

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const next = applyNodeChanges(changes, nodesRef.current);
      setNodes(next);
      syncNodes(next);
    },
    [syncNodes]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const next = applyEdgeChanges(changes, edgesRef.current);
      setEdges(next);
      syncEdges(next);
    },
    [syncEdges]
  );

  const handleConnect: OnConnect = useCallback(
    (conn) => {
      const id = `edge-${conn.source}-${conn.target}-${Date.now()}`;
      const newEdge: Edge = { ...conn, id, animated: true, style: { stroke: "rgba(255,255,255,0.45)", strokeWidth: 2.5 } };
      const next = [...edgesRef.current, newEdge];
      setEdges(next);
      syncEdges(next);
    },
    [syncEdges]
  );

  const handleSelectionChange = useCallback(({ nodes: selNodes }: { nodes: Node[] }) => {
    setSelectedId(selNodes.length === 1 ? selNodes[0].id : null);
  }, []);

  const addNewNode = useCallback(() => {
    const id = `${slug}-${Date.now()}`;
    const x = 150 + Math.random() * 300;
    const y = 150 + Math.random() * 200;
    const newNode: Node = { id, position: { x, y }, data: { label: "New Node" }, type: "editor" };
    const next = [...nodesRef.current, newNode];
    setNodes(next);
    syncNodes(next);
  }, [slug, syncNodes]);

  const deleteNode = useCallback(() => {
    if (!selectedId) return;
    const nodeNext = nodesRef.current.filter((n) => n.id !== selectedId);
    const edgeNext = edgesRef.current.filter((e) => e.source !== selectedId && e.target !== selectedId);
    setNodes(nodeNext);
    setEdges(edgeNext);
    syncNodes(nodeNext);
    syncEdges(edgeNext);
    setSelectedId(null);
  }, [selectedId, syncNodes, syncEdges]);

  const updateNodeLabel = useCallback((id: string, label: string) => {
    const next = nodesRef.current.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, label } } : n
    );
    setNodes(next);
    syncNodes(next);
  }, [syncNodes]);

  const updateNodeDescription = useCallback((id: string, description: string) => {
    const next = nodesRef.current.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, description } } : n
    );
    setNodes(next);
    syncNodes(next);
  }, [syncNodes]);

  const updateNodeField = useCallback((id: string, key: string, value: NodeFieldValue) => {
    const next = nodesRef.current.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n
    );
    setNodes(next);
    syncNodes(next);
  }, [syncNodes]);

  const selectedNode = selectedId ? nodes.find((n) => n.id === selectedId) : null;

  const connectedEdges = selectedId
    ? edges.filter((e) => e.source === selectedId || e.target === selectedId)
    : [];

  const updateEdgeLabel = useCallback((id: string, label: string) => {
    const next = edgesRef.current.map((e) =>
      e.id === id ? { ...e, label } : e
    );
    setEdges(next);
    syncEdges(next);
  }, [syncEdges]);

  const deleteEdge = useCallback((id: string) => {
    const next = edgesRef.current.filter((e) => e.id !== id);
    setEdges(next);
    syncEdges(next);
  }, [syncEdges]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={addNewNode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/15 transition-all"
        >
          <Plus size={13} /> Add Node
        </button>
        {selectedId && (
          <button
            onClick={deleteNode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
          >
            <Trash2 size={13} /> Delete
          </button>
        )}
        <span className="text-xs text-white/20 ml-auto">
          {nodes.length} node{nodes.length !== 1 ? "s" : ""}, {edges.length} edge{edges.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="h-[400px] bg-[#050505] rounded-2xl overflow-hidden border border-white/[0.06]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onSelectionChange={handleSelectionChange}
          nodeTypes={nodeTypes}
          proOptions={{ hideAttribution: true }}
          fitView
          fitViewOptions={{ padding: 0.3, duration: 200 }}
          minZoom={0.2}
          maxZoom={3}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          deleteKeyCode={["Backspace", "Delete"]}
          onNodesDelete={(deleted) => {
            const deletedIds = new Set(deleted.map((n) => n.id));
            const nodeNext = nodesRef.current.filter((n) => !deletedIds.has(n.id));
            const edgeNext = edgesRef.current.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target));
            setNodes(nodeNext);
            setEdges(edgeNext);
            syncNodes(nodeNext);
            syncEdges(edgeNext);
            setSelectedId(null);
          }}
          onEdgesDelete={(deleted) => {
            const deletedIds = new Set(deleted.map((e) => e.id));
            const edgeNext = edgesRef.current.filter((e) => !deletedIds.has(e.id));
            setEdges(edgeNext);
            syncEdges(edgeNext);
          }}
        >
          <Background color="#ffffff06" gap={20} size={0.5} />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Node Properties</span>
            <span className="text-[10px] font-mono text-white/20">{selectedNode.id}</span>
          </div>
          <div className="space-y-2.5">
            <input
              value={(selectedNode.data as unknown as EditorNodeData)?.label ?? ""}
              onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
              placeholder="Node label"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 transition-all placeholder:text-white/20"
            />
            <input
              value={(selectedNode.data as unknown as EditorNodeData)?.description ?? ""}
              onChange={(e) => updateNodeDescription(selectedNode.id, e.target.value)}
              placeholder="Node description"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-white/20 transition-all placeholder:text-white/20"
            />
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Content (paragraphs)</label>
              {((selectedNode.data as unknown as EditorNodeData)?.content ?? [""]).map((p, pi) => (
                <div key={pi} className="flex gap-1.5">
                  <textarea
                    value={p}
                    onChange={(e) => {
                      const next = [...((selectedNode.data as unknown as EditorNodeData)?.content ?? [""])];
                      next[pi] = e.target.value;
                      updateNodeField(selectedNode.id, "content", next);
                    }}
                    placeholder="Paragraph text..."
                    rows={2}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/70 outline-none focus:border-white/20 transition-all placeholder:text-white/20 resize-y"
                  />
                  <button
                    onClick={() => {
                      const next = ((selectedNode.data as unknown as EditorNodeData)?.content ?? []).filter((_, j) => j !== pi);
                      updateNodeField(selectedNode.id, "content", next.length > 0 ? next : undefined);
                    }}
                    className="text-white/20 hover:text-red-400 transition-all self-start mt-1.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const next = [...((selectedNode.data as unknown as EditorNodeData)?.content ?? []), ""];
                  updateNodeField(selectedNode.id, "content", next);
                }}
                className="text-xs text-white/30 hover:text-white transition-all"
              >
                + Add paragraph
              </button>
            </div>
          </div>
          {connectedEdges.length > 0 && (
            <div className="pt-2 border-t border-white/[0.06] space-y-2">
              <span className="text-xs font-bold text-white/30 uppercase tracking-wider">Connected Edges</span>
              {connectedEdges.map((e) => (
                <div key={e.id} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/20 font-mono shrink-0">
                    {e.source}→{e.target}
                  </span>
                  <input
                    value={typeof e.label === "string" ? e.label : ""}
                    onChange={(ev) => updateEdgeLabel(e.id, ev.target.value)}
                    placeholder="Edge label"
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-sm text-white/70 outline-none focus:border-white/20 transition-all placeholder:text-white/20"
                  />
                  <button
                    onClick={() => deleteEdge(e.id)}
                    className="text-white/20 hover:text-red-400 transition-all shrink-0"
                    title="Delete edge"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 text-xs text-white/30">
            <span>X: {Math.round(selectedNode.position.x)}</span>
            <span>Y: {Math.round(selectedNode.position.y)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModuleGraphEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}
