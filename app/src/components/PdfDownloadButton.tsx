"use client";

import { FileDown } from "lucide-react";

export default function PdfDownloadButton() {
  const handleDownloadPdf = () => {
    const article = document.querySelector("article");
    if (!article) return;
    const pageTitle = document.querySelector("h1")?.textContent || document.title;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head><title>${pageTitle} - 1section.com</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 0 auto; padding: 0; color: #111; line-height: 1.8; font-size: 14px; background: #fff !important; }
          img { max-width: 100%; height: auto; }
          h1 { font-size: 1.75em; margin-bottom: 0.5em; font-weight: 700; page-break-after: avoid; }
          h2 { font-size: 1.35em; margin-top: 1.5em; font-weight: 600; page-break-after: avoid; }
          h3 { font-size: 1.15em; margin-top: 1.25em; font-weight: 600; page-break-after: avoid; }
          p, li { margin: 0.5em 0; font-size: 14px; page-break-inside: avoid; }
          * { color: #111 !important; background: transparent !important; }
        </style>
      </head>
      <body>${article.innerHTML}</body>
      </html>
    `);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 1000);
    }, 300);
  };

  return (
    <button
      onClick={handleDownloadPdf}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer text-muted bg-bg-elevated border border-border hover:text-fg hover:border-border-light"
    >
      <FileDown size={16} />
    </button>
  );
}
