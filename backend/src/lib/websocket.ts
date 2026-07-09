import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import crypto from "crypto";
import { env } from "../config/env";
import { verifyToken } from "./jwt";
import { getRedis } from "./redis";

type WsMessage =
  | { type: "subscription_updated"; data: { subscriptionStatus: string } }
  | { type: "payment_success"; data: { subscriptionStatus: string } }
  | { type: "payment_failed"; data: { message: string } }
  | { type: "payment_error"; data: { message: string } }
  | { type: string; data?: Record<string, string | number | boolean> };

interface Client {
  ws: WebSocket;
  userId: string;
}

const INSTANCE_ID = crypto.randomUUID();
let wss: WebSocketServer;
const clients = new Map<string, Client[]>();

function registerClient(userId: string, ws: WebSocket): void {
  if (!clients.has(userId)) {
    clients.set(userId, []);
  }
  clients.get(userId)!.push({ ws, userId });
}

function removeClient(userId: string, ws: WebSocket): void {
  const userClients = clients.get(userId);
  if (userClients) {
    const filtered = userClients.filter((c) => c.ws !== ws);
    if (filtered.length === 0) {
      clients.delete(userId);
    } else {
      clients.set(userId, filtered);
    }
  }
}

const wsAuthAttempts = new Map<string, { count: number; resetAt: number }>();
const WS_AUTH_MAX_ATTEMPTS = 5;
const WS_AUTH_WINDOW_MS = 60000;

function checkWsRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = wsAuthAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    wsAuthAttempts.set(ip, { count: 1, resetAt: now + WS_AUTH_WINDOW_MS });
    return true;
  }
  if (entry.count >= WS_AUTH_MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of wsAuthAttempts) {
    if (now > entry.resetAt) wsAuthAttempts.delete(ip);
  }
}, 60000);

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
      const parsed = JSON.parse(message) as { userId: string; data: WsMessage; instanceId: string };
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

function sendToUserLocal(userId: string, data: WsMessage) {
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

  function parseCookie(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(";")) {
      const trimmed = part.trim();
      if (trimmed.startsWith(name + "=")) {
        return trimmed.slice(name.length + 1) || null;
      }
    }
    return null;
  }

  function setupCloseHandler(userIdRef: () => string | null, ws: WebSocket): void {
    ws.on("close", () => {
      const uid = userIdRef();
      if (uid) {
        removeClient(uid, ws);
      }
    });
    ws.on("error", () => {});
  }

  wss.on("connection", (ws, req) => {
    let userId: string | null = null;
    let authenticated = false;

    const userIdRef = () => userId;

    // Try cookie-based auth first (httpOnly cookie sent automatically)
    const cookieToken = parseCookie(req.headers.cookie, "token");
    if (cookieToken) {
      try {
        const payload = verifyToken(cookieToken);
        userId = payload.userId;
        authenticated = true;

        registerClient(userId, ws);
        setupCloseHandler(userIdRef, ws);
        return;
      } catch {
        // cookie invalid — fall through to message auth
      }
    }

    const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
      || req.socket.remoteAddress
      || "unknown";

    const onMessage = (data: Buffer) => {
      if (authenticated) return;

      if (!checkWsRateLimit(clientIp)) {
        ws.close(4009, "Too many auth attempts");
        return;
      }

      try {
        const msg = JSON.parse(data.toString());
        if (msg.type !== "auth" || !msg.token) {
          ws.close(4001, "Missing auth");
          return;
        }

        const payload = verifyToken(msg.token);
        userId = payload.userId;
        authenticated = true;

        registerClient(userId, ws);
        ws.off("message", onMessage);
        setupCloseHandler(userIdRef, ws);
      } catch {
        ws.close(4001, "Invalid auth");
      }
    };

    ws.on("message", onMessage);

    // Timeout: if no auth within 10s, close
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        ws.close(4001, "Auth timeout");
      }
    }, 10000);

    ws.on("close", () => clearTimeout(authTimeout));
  });

  return wss;
}

export function sendToUser(userId: string, data: WsMessage) {
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
