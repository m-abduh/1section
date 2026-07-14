"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Eye,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import ModuleGraph from "@/components/ModuleGraph";
import ModuleContent from "@/components/ModuleContent";
import ModuleForm, { type ModuleFormData, type NodeForm } from "@/components/ModuleForm";
import Badge from "@/components/Badge";

interface RawNode {
  id: string;
  positionX?: number;
  positionY?: number;
  position?: { x: number; y: number };
  label?: string;
  data?: { label?: string; description?: string; content?: string | string[] };
  description?: string;
  content?: string | string[];
  type?: string;
}

interface RawEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

interface RawQuestion {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface RawModule {
  id?: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  isPremium: boolean;
  isDraft: boolean;
  nodes: RawNode[];
  edges: RawEdge[];
  questions: RawQuestion[];
}

function safeParseContent(content: string | string[] | undefined): string[] | undefined {
  if (!content) return undefined;
  if (Array.isArray(content)) return content;
  try { return JSON.parse(content) as string[]; } catch { return undefined; }
}

function normalizeNode(n: RawNode): NodeForm {
  const pos = n.position ?? { x: n.positionX ?? 0, y: n.positionY ?? 0 };
  return {
    id: n.id,
    positionX: pos.x,
    positionY: pos.y,
    label: n.data?.label ?? n.label ?? "",
    description: n.data?.description ?? n.description ?? undefined,
    content: safeParseContent(n.data?.content ?? n.content),
    type: n.type ?? "custom",
  };
}

interface ApiError {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

function getErrorMessage(err: unknown, fallback: string): string {
  const apiErr = err as ApiError;
  const msg = apiErr.response?.data?.error?.message || apiErr.response?.data?.error;
  return typeof msg === "string" ? msg : fallback;
}

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slugParam = params.id;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam ?? "";
  const isNew = slug === "new";

  const [editing, setEditing] = useState(isNew);
  const [deleting, setDeleting] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const [form, setForm] = useState<ModuleFormData>({
    title: "", slug: "", description: "", category: "",
    isPremium: true, isDraft: true, nodes: [], edges: [], questions: [],
  });

  const { data: mod, isLoading } = useQuery<RawModule>({
    queryKey: ["admin", "module", slug],
    queryFn: async () => {
      const { data } = await api.get(`/modules/${slug}?admin=true`);
      return data as RawModule;
    },
    enabled: !!slug && !isNew,
  });

  useEffect(() => {
    if (mod && !isNew && !editing) {
      setForm({
        title: mod.title || "",
        slug: mod.slug || "",
        description: mod.description || "",
        category: mod.category || "",
        isPremium: mod.isPremium || false,
        isDraft: mod.isDraft ?? false,
        nodes: (mod.nodes || []).map(normalizeNode),
        edges: (mod.edges || []).map((e) => ({
          id: e.id, source: e.source, target: e.target, label: e.label || "", animated: e.animated ?? true,
        })),
        questions: (mod.questions || []).map((q) => ({
          question: q.question, options: q.options || [], correctAnswer: q.correctAnswer ?? 0, explanation: q.explanation || "",
        })),
      });
    }
  }, [mod, editing, isNew]);

  const createMutation = useMutation({
    mutationFn: async (data: ModuleFormData) => {
      const { data: res } = await api.post("/modules", {
        title: data.title, slug: data.slug, description: data.description,
        category: data.category, isPremium: data.isPremium, isDraft: data.isDraft,
        nodes: data.nodes, edges: data.edges, questions: data.questions,
      });
      return res as RawModule;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "modules"] });
      toast.success("Module created");
      router.replace(`/dashboard/modules/${res.slug}`);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to create"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ModuleFormData) => {
      const { data: res } = await api.patch(`/modules/${slug}`, {
        title: data.title, slug: data.slug, description: data.description,
        category: data.category, isPremium: data.isPremium, isDraft: data.isDraft,
        nodes: data.nodes, edges: data.edges, questions: data.questions,
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "module", slug] });
      queryClient.invalidateQueries({ queryKey: ["admin", "modules"] });
      setEditing(false);
      toast.success("Module updated");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to update"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => { await api.delete(`/modules/${slug}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "modules"] });
      toast.success("Module deleted");
      router.replace("/dashboard/modules");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to delete"));
      setDeleting(false);
    },
  });

  const addQuestion = useCallback(() => {
    setForm((f) => ({
      ...f,
      questions: [...f.questions, { question: "", options: ["", ""], correctAnswer: 0, explanation: "" }],
    }));
  }, []);

  const updateField = useCallback(<K extends keyof ModuleFormData>(key: K, value: ModuleFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const handleSave = () => {
    if (isNew) { createMutation.mutate(form); }
    else { updateMutation.mutate(form); }
  };

  const handleAiGenerate = useCallback(async (mode: "questions" | "graph") => {
    setAiLoading(mode);
    try {
      const { data } = await api.post("/ai/generate", {
        mode,
        title: form.title,
        description: form.description,
      });

      if (mode === "questions" && data.questions) {
        updateField("questions", data.questions);
        toast.success(`${data.questions.length} questions generated`);
      } else if (mode === "graph") {
        if (data.nodes) updateField("nodes", data.nodes);
        if (data.edges) updateField("edges", data.edges);
        toast.success(`Graph generated (${data.nodes?.length || 0} nodes, ${data.edges?.length || 0} edges)`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "AI generation failed"));
    } finally {
      setAiLoading(null);
    }
  }, [form.title, form.description, updateField]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!mod && !isNew) {
    return (
      <div className="text-center py-20">
        <p className="text-[#555]">Module not found</p>
        <Link href="/dashboard/modules" className="text-sm text-white underline mt-4 inline-block">
          Back to modules
        </Link>
      </div>
    );
  }

  const currentMod = !isNew ? (mod as RawModule) : null;
  const sourceNodes = (form.nodes && form.nodes.length > 0 ? form.nodes : currentMod?.nodes) || [];
      const viewNodes = isNew ? [] : sourceNodes.map((n: RawNode | NodeForm) => {
    const rawN = n as RawNode;
    const formN = n as NodeForm;
    return {
      id: n.id,
      position: rawN.position ?? { x: formN.positionX ?? 0, y: formN.positionY ?? 0 },
      data: {
        label: rawN.data?.label ?? formN.label ?? "",
        description: rawN.data?.description ?? formN.description ?? undefined,
        content: safeParseContent(rawN.data?.content ?? formN.content),
      },
      type: n.type || "custom",
    };
  });

  return (
    <div className="max-w-[960px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/modules"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-all"
        >
          <ArrowLeft size={16} /> Back to Modules
        </Link>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              {!isNew && (
                <button
                  onClick={() => { setEditing(false); setDeleting(false); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Eye size={15} /> Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending || createMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white text-black hover:opacity-90 transition-all disabled:opacity-50"
              >
                <Save size={15} /> {updateMutation.isPending || createMutation.isPending ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            !isNew && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/10 text-white hover:bg-white/15 transition-all"
              >
                <Pencil size={15} /> Edit
              </button>
            )
          )}
        </div>
      </div>

      {editing ? (
        <ModuleForm
          form={form}
          updateField={updateField}
          addQuestion={addQuestion}
          onSave={handleSave}
          isSaving={updateMutation.isPending || createMutation.isPending}
          isNew={isNew}
          slug={form.slug || "module"}
          onDelete={isNew ? undefined : () => deleteMutation.mutate()}
          deleting={deleting}
          setDeleting={isNew ? undefined : setDeleting}
          onAiGenerate={handleAiGenerate}
          aiLoading={aiLoading}
        />
      ) : currentMod ? (
        /* ===== VIEW MODE ===== */
        <>
          <div className="flex items-center gap-3">
            <Badge variant="default">{currentMod.category}</Badge>
            {currentMod.isDraft && (
              <Badge variant="warning">Draft</Badge>
            )}
            {currentMod.isPremium ? (
              <Badge variant="warning">Premium</Badge>
            ) : (
              <Badge variant="success">Free</Badge>
            )}
            {currentMod.questions?.length > 0 && (
              <span className="text-xs font-medium text-white/30">
                {currentMod.questions.length} question{currentMod.questions.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <article>
            <ModuleContent title={currentMod.title} description={currentMod.description} nodes={currentMod.nodes || []} />
          </article>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Knowledge Graph</h3>
                <p className="text-xs text-white/30 mt-0.5">Visual overview of module structure</p>
              </div>
            </div>
            <ModuleGraph
              nodes={viewNodes}
              edges={currentMod.edges || []}
              nodeList={form.nodes}
              onNodesChange={(nodes) => updateField("nodes", nodes)}
              edgeList={form.edges}
              onEdgesChange={(edges) => updateField("edges", edges)}
            />
          </div>

          {currentMod.questions && currentMod.questions.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Quiz Questions ({currentMod.questions.length})</h3>
              <div className="space-y-3">
                {currentMod.questions.map((q, i) => (
                  <div key={q.id || i} className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-xl p-4">
                    <p className="text-sm text-white font-medium mb-3">
                      {i + 1}. {q.question}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {q.options?.map((opt, oi) => (
                        <div
                          key={oi}
                          className={`text-xs px-3 py-1.5 rounded-lg ${
                            oi === q.correctAnswer
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-white/5 text-white/40"
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
