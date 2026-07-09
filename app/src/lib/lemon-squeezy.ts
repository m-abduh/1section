declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Setup: (options: {     eventHandler: (event: { event: string; data?: Record<string, string> }) => void }) => void;
      Url: {
        Open: (url: string) => void;
        Close: () => void;
      };
      Refresh: () => void;
    };
  }
}

let initialized = false;

function setupEventHandler() {
  if (initialized) return;
  initialized = true;
  window.LemonSqueezy?.Setup({
    eventHandler: (event) => {
      if (event.event === "Checkout.Success") {
        window.LemonSqueezy?.Url.Close();
        window.location.href = "/payment/success";
      }
    },
  });
}

export function initLemonSqueezy() {
  if (typeof window === "undefined") return;

  if (window.LemonSqueezy) {
    setupEventHandler();
    return;
  }

  const originalCreate = window.createLemonSqueezy;
  window.createLemonSqueezy = () => {
    originalCreate?.();
    setupEventHandler();
  };
}

export function openCheckout(url: string) {
  if (window.LemonSqueezy?.Url) {
    try {
      window.LemonSqueezy.Url.Open(url);

      const observer = new MutationObserver(() => {
        const iframes = document.querySelectorAll<HTMLIFrameElement>(
          'iframe[src*="lemonsqueezy"]',
        );
        iframes.forEach((iframe) => {
          iframe.setAttribute("allowtransparency", "true");
          iframe.style.background = "transparent";
        });
        if (iframes.length > 0) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });

      return;
    } catch {}
  }
  window.open(url, "_blank");
}
