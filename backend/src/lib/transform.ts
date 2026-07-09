function safeParseContent(content: string | string[]): string[] {
  if (Array.isArray(content)) return content;
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [content];
  } catch {
    return [content];
  }
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export interface ReactFlowNode {
  id: string;
  position: { x: number; y: number };
  data: { label: string; nodeSlug?: string; description?: string; content?: string[]; isCompleted?: boolean };
  type?: string;
  style?: Record<string, string>;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export function transformNode(node: {
  id: string;
  positionX: number;
  positionY: number;
  label: string;
  slug?: string | null;
  description?: string | null;
  content?: string | null;
  type?: string | null;
  style?: unknown;
}): ReactFlowNode {
  return {
    id: node.id,
    position: { x: node.positionX, y: node.positionY },
    data: {
      label: node.label,
      nodeSlug: node.slug || slugify(node.label),
      ...(node.description ? { description: node.description } : {}),
      ...(node.content ? { content: safeParseContent(node.content) } : {}),
    },
    type: node.type || "custom",
    ...(node.style ? { style: node.style as Record<string, string> } : {}),
  };
}

export function transformEdge(edge: {
  id: string;
  source: string;
  target: string;
  label?: string | null;
  animated?: boolean | null;
}): ReactFlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(edge.label ? { label: edge.label } : {}),
    animated: edge.animated ?? true,
  };
}
