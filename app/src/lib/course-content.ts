const fallbackIntro = [
  "Let's begin by exploring",
  "Now let's dive deeper into",
  "Building on that, let's look at",
  "Here's where things get interesting —",
  "Next up:",
  "Let's continue with",
];

const fallbackOutro = [
  "Take a moment to reflect on that before moving on.",
  "Keep this in mind as we continue.",
  "This will be important for what comes next.",
];

export function getNodeContent(node: { data?: { label?: string; description?: string; content?: string[] } }, index: number, total: number): string[] {
  if (node.data?.content && node.data.content.length > 0) {
    return node.data.content;
  }

  const label = node.data?.label || "";
  const desc = node.data?.description || "";
  const lines: string[] = [];
  const intro = fallbackIntro[index % fallbackIntro.length];
  lines.push(`${intro} "${label}". ${desc}`);
  if (index < total - 1) {
    lines.push(fallbackOutro[index % fallbackOutro.length]);
  }
  return lines;
}

export function getFullText(nodes: any[]): string {
  return nodes
    .map((n: any, i: number) => {
      return getNodeContent(n, i, nodes.length).join(" ");
    })
    .join(" ");
}

export function getNodeLabels(nodes: any[]): string[] {
  return nodes.map((n: any) => n.data?.label || "Untitled");
}

export interface Slide {
  nodeId: string;
  nodeLabel: string;
  nodeIndex: number;
  slideIndex: number;
  totalSlidesInNode: number;
  content: string;
}

export function getSlides(nodes: any[]): Slide[] {
  const slides: Slide[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const label = n.data?.label || "";
    const paragraphs = getNodeContent(n, i, nodes.length);
    paragraphs.forEach((p, pi) => {
      slides.push({
        nodeId: n.data?.nodeSlug || n.id,
        nodeLabel: label,
        nodeIndex: i,
        slideIndex: pi,
        totalSlidesInNode: paragraphs.length,
        content: p,
      });
    });
  }
  return slides;
}