"use client";

export default function ModuleContent({
  title,
  description,
  nodes,
}: {
  title: string;
  description: string;
  nodes: any[];
}) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <div className="space-y-8">
      {nodes.map((n: any, i: number) => {
        const label = n.data?.label || n.label || `Node ${i + 1}`;
        const content = n.data?.content || n.content;
        const paragraphs: string[] = content
          ? (typeof content === "string" ? JSON.parse(content) : content)
          : [];
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
