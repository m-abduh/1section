"use client";

interface ContentNode {
  id?: string;
  label?: string;
  data?: { label?: string; content?: string | string[] };
  content?: string | string[];
}

function parseContent(content: string | string[] | undefined | null): string[] {
  if (!content) return [];
  if (Array.isArray(content)) return content;
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [content];
    } catch {
      return [content];
    }
  }
  return [];
}

export default function ModuleContent({
  title,
  description,
  nodes,
}: {
  title: string;
  description: string;
  nodes: ContentNode[];
}) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <div className="space-y-8">
      {nodes.map((n: ContentNode, i: number) => {
        const label = n.data?.label || n.label || `Node ${i + 1}`;
        const paragraphs = parseContent(n.data?.content || n.content);
        return (
          <div key={n.id || i} className="border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-white/40 bg-white/[0.04] px-2 py-0.5 rounded">
                {i + 1}
              </span>
              <h3 className="text-sm font-bold text-white">{label}</h3>
            </div>
            {paragraphs.length > 0 ? (
              <div className="space-y-2">
                {paragraphs.map((p: string, pi: number) => (
                  <p key={pi} className="text-sm text-white/60 leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/20 italic">No content</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
