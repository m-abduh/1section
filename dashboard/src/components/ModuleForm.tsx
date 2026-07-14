"use client";

import { useCallback } from "react";
import { Save, Trash2, Plus, X, AlertTriangle, Sparkles } from "lucide-react";
import ModuleGraphEditor from "@/components/ModuleGraphEditor";

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

export interface QuestionForm {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface ModuleFormData {
  title: string;
  slug: string;
  description: string;
  category: string;
  isPremium: boolean;
  isDraft: boolean;
  nodes: NodeForm[];
  edges: EdgeForm[];
  questions: QuestionForm[];
}

interface Props {
  form: ModuleFormData;
  updateField: <K extends keyof ModuleFormData>(key: K, value: ModuleFormData[K]) => void;
  addQuestion: () => void;
  onSave: () => void;
  isSaving: boolean;
  isNew: boolean;
  slug: string;
  onDelete?: () => void;
  deleting?: boolean;
  setDeleting?: (v: boolean) => void;
  onAiGenerate?: (mode: "questions" | "graph") => void;
  aiLoading?: string | null;
}

export default function ModuleForm({
  form,
  updateField,
  addQuestion,
  onSave,
  isSaving,
  isNew,
  slug,
  onDelete,
  deleting,
  setDeleting,
  onAiGenerate,
  aiLoading,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 space-y-5">
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Basic Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/40">Title</label>
            <input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/40">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 transition-all font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/40">Category</label>
            <input
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 transition-all"
            />
          </div>
          <div className="space-y-1.5 flex items-end pb-2.5">
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-xs font-medium text-white/40">Draft</span>
              <button
                type="button"
                onClick={() => updateField("isDraft", !form.isDraft)}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.isDraft ? "bg-amber-500" : "bg-white/10"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isDraft ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>
            <label className="flex items-center gap-3 cursor-pointer ml-4">
              <span className="text-xs font-medium text-white/40">Premium</span>
              <button
                type="button"
                onClick={() => updateField("isPremium", !form.isPremium)}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.isPremium ? "bg-amber-500" : "bg-white/10"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPremium ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/40">Description</label>
          <input
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 transition-all"
          />
        </div>
      </div>

      {/* Knowledge Graph */}
      <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Knowledge Graph</h3>
          {onAiGenerate && (
            <button
              type="button"
              onClick={() => onAiGenerate("graph")}
              disabled={aiLoading === "graph"}
              className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 transition-all disabled:opacity-50"
            >
              <Sparkles size={12} />
              {aiLoading === "graph" ? "Generating..." : "AI Suggest"}
            </button>
          )}
        </div>
        <ModuleGraphEditor
          nodes={form.nodes}
          edges={form.edges}
          onNodesChange={(nodes) => updateField("nodes", nodes)}
          onEdgesChange={(edges) => updateField("edges", edges)}
          slug={form.slug || "module"}
        />
      </div>

      {/* Questions */}
      <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Questions ({form.questions.length})</h3>
          <div className="flex items-center gap-2">
            {onAiGenerate && (
              <button
                type="button"
                onClick={() => onAiGenerate("questions")}
                disabled={aiLoading === "questions"}
                className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 transition-all disabled:opacity-50"
              >
                <Sparkles size={12} />
                {aiLoading === "questions" ? "Generating..." : "AI Generate"}
              </button>
            )}
            <button onClick={addQuestion} className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white transition-all">
              <Plus size={13} /> Add Question
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {form.questions.map((q, i) => (
            <div key={i} className="bg-white/[0.03] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/30">Q{i + 1}</span>
                <button
                  onClick={() => updateField("questions", form.questions.filter((_, j) => j !== i))}
                  className="text-white/20 hover:text-red-400 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
              <input
                value={q.question}
                onChange={(e) => {
                  const n = [...form.questions];
                  n[i] = { ...n[i], question: e.target.value };
                  updateField("questions", n);
                }}
                placeholder="Question text"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-white/20 transition-all placeholder:text-white/20"
              />
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const n = [...form.questions];
                        n[i] = { ...n[i], correctAnswer: oi };
                        updateField("questions", n);
                      }}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        oi === q.correctAnswer ? "border-emerald-400" : "border-white/10"
                      }`}
                    >
                      {oi === q.correctAnswer && <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />}
                    </button>
                    <input
                      value={opt}
                      onChange={(e) => {
                        const n = [...form.questions];
                        const opts = [...n[i].options];
                        opts[oi] = e.target.value;
                        n[i] = { ...n[i], options: opts };
                        updateField("questions", n);
                      }}
                      placeholder={`Option ${oi + 1}`}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-white/20 transition-all placeholder:text-white/20"
                    />
                    {q.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const n = [...form.questions];
                          const opts = n[i].options.filter((_, j) => j !== oi);
                          let ca = n[i].correctAnswer;
                          if (oi < ca) ca--;
                          else if (oi === ca) ca = 0;
                          n[i] = { ...n[i], options: opts, correctAnswer: ca };
                          updateField("questions", n);
                        }}
                        className="text-white/20 hover:text-red-400 transition-all"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const n = [...form.questions];
                    n[i] = { ...n[i], options: [...n[i].options, ""] };
                    updateField("questions", n);
                  }}
                  className="text-xs text-white/30 hover:text-white transition-all"
                >
                  + Add option
                </button>
              </div>
            </div>
          ))}
          {form.questions.length === 0 && (
            <p className="text-xs text-white/20 text-center py-6">No questions yet</p>
          )}
        </div>
      </div>

      {/* Delete */}
      {!isNew && onDelete && setDeleting !== undefined && (
        <div className="border border-red-500/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-red-400">Danger Zone</h3>
              <p className="text-xs text-white/30 mt-1">Permanently delete this module and all its data.</p>
            </div>
            {deleting ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleting(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white/40 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  <AlertTriangle size={14} /> Delete
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDeleting(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 size={15} /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
