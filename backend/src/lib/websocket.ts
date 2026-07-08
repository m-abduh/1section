import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { getRedis } from "./redis";

interface Client {
  ws: WebSocket;
  userId: string;
}

const INSTANCE_ID = crypto.randomUUID();
let wss: WebSocketServer;
const clients = new Map<string, Client[]>();

const WS_CHANNEL = "ws:broadcast";

function setupRedisSubscriber() {
  const redis = getRedis();
  if (!redis) return;

  const sub = redis.duplicate();
  sub.subscribe(WS_CHANNEL, (err) => {
    if (err) {
      console.error("[WS] Redis subscribe failed:", err.message);
    }
  });

  sub.on("message", (_channel, message) => {
    try {
      const parsed = JSON.parse(message) as { userId: string; data: Record<string, unknown>; instanceId: string };
      if (parsed.instanceId === INSTANCE_ID) return;
      sendToUserLocal(parsed.userId, parsed.data);
    } catch {
      // ignore malformed messages
    }
  });

  sub.on("error", (err) => {
    console.error("[WS] Redis subscriber error:", err.message);
  });
}

function sendToUserLocal(userId: string, data: Record<string, unknown>) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const message = JSON.stringify(data);
  for (const client of userClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  setupRedisSubscriber();

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
  sendToUserLocal(userId, data);

  const redis = getRedis();
  if (redis) {
    redis.publish(WS_CHANNEL, JSON.stringify({ userId, data, instanceId: INSTANCE_ID })).catch(() => {
      // silently fail — local delivery already happened
    });
  }
}

export function getWss() {
  return wss;
}
