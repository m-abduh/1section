"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, background: "#030303", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <style>{`
          .error-reset-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 14px 16px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s;
          }
          .error-reset-btn:hover {
            background: rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.2);
          }
        `}</style>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 30% 20%, rgba(255,95,0,0.10) 0%, transparent 40%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 70% 80%, rgba(167,139,250,0.06) 0%, transparent 40%)",
            pointerEvents: "none",
          }} />

          <div style={{
            width: "100%",
            maxWidth: "420px",
            textAlign: "center",
            position: "relative",
            zIndex: 10,
          }}>
            <div style={{ marginBottom: "40px" }}>
              <img
                src="/1section.svg"
                alt="1SECTION"
                style={{ height: "40px", margin: "0 auto 32px", opacity: 0.6 }}
              />
              <div style={{
                width: "80px",
                height: "80px",
                margin: "0 auto 24px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{ fontSize: "36px", fontWeight: 900, color: "rgba(255,255,255,0.2)" }}>!</span>
              </div>
              <h1 style={{
                fontSize: "28px",
                fontWeight: 900,
                color: "#fff",
                margin: "0 0 8px",
                letterSpacing: "-0.02em",
              }}>
                Critical error
              </h1>
              <p style={{
                color: "#555",
                fontSize: "14px",
                maxWidth: "300px",
                margin: "0 auto",
                lineHeight: 1.6,
              }}>
                The application failed to load. Please refresh.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                onClick={reset}
                className="error-reset-btn"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
