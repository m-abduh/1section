import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

interface Client {
  ws: WebSocket;
  userId: string;
}

let wss: WebSocketServer;
const clients = new Map<string, Client[]>();

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Missing token");
      return;
    }

    try {
      const payload = jwt.verify(token, env.jwt.secret) as { userId: string };
      const userId = payload.userId;

      if (!clients.has(userId)) {
        clients.set(userId, []);
      }
      clients.get(userId)!.push({ ws, userId });

      ws.on("close", () => {
        const userClients = clients.get(userId);
        if (userClients) {
          const filtered = userClients.filter((c) => c.ws !== ws);
          if (filtered.length === 0) {
            clients.delete(userId);
          } else {
            clients.set(userId, filtered);
          }
        }
      });

      ws.on("error", () => {
        // cleanup handled by close
      });
    } catch {
      ws.close(4001, "Invalid token");
    }
  });

  return wss;
}

export function sendToUser(userId: string, data: Record<string, unknown>) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const message = JSON.stringify(data);
  for (const client of userClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

export function getWss() {
  return wss;
}
