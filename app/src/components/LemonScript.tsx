"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

export function LemonScript() {
  const inited = useRef(false);

  useEffect(() => {
    if (!inited.current && window.LemonSqueezy) {
      window.createLemonSqueezy?.();
      inited.current = true;
    }
  });

  return (
    <>
      <style>{`.lemonsqueezy-loader { background: rgba(0,0,0,0.6) !important; }`}</style>
      <Script
        src="https://app.lemonsqueezy.com/js/lemon.js"
        strategy="afterInteractive"
        onLoad={() => {
          window.createLemonSqueezy?.();
        }}
      />
    </>
  );
}
