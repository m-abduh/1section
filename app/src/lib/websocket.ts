const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws";

interface WsMessage {
  type: string;
  data?: Record<string, string | number | boolean>;
  [key: string]: string | number | boolean | Record<string, string | number | boolean> | undefined;
}

type MessageHandler = (data: WsMessage) => void;

export class PaymentWebSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, MessageHandler[]>();
  private userId: string | null = null;
  private retryCount = 0;
  private maxRetries = 5;

  connect(userId: string) {
    this.disconnect();
    this.userId = userId;
    this.retryCount = 0;

    this.ws = new WebSocket(WS_URL);

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
      if (this.userId && this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => this.connect(this.userId!), Math.min(3000 * this.retryCount, 15000));
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
