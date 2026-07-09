const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws";

type MessageHandler = (data: Record<string, unknown>) => void;

export class PaymentWebSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, MessageHandler[]>();
  private userId: string | null = null;

  connect(userId: string) {
    this.disconnect();
    this.userId = userId;

    const token = localStorage.getItem("token");
    if (!token) return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this.ws!.send(JSON.stringify({ type: "auth", token }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const type = data.type as string;
        const handlers = this.handlers.get(type) || [];
        handlers.forEach((h) => h(data));
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      // reconnect after 3s if not intentional
      if (this.userId) {
        setTimeout(() => this.connect(this.userId!), 3000);
      }
    };

    this.ws.onerror = () => {
      // will trigger onclose
    };
  }

  disconnect() {
    this.userId = null;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);

    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    };
  }
}

export const paymentWs = new PaymentWebSocket();
