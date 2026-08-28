import { createHash } from "node:crypto";
import type { PluginStateSyncKeyedStore } from "openclaw/plugin-sdk/plugin-state-runtime";

export type SessionListing = {
  L_Address?: string | undefined;
  L_City?: string | undefined;
  price?: number | undefined;
  beds?: number | undefined;
  baths?: number | undefined;
  sqft?: number | undefined;
  DaysOnMarket?: number | undefined;
};

export interface UserSession {
  city?: string;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  type?: string;
  pool?: string;
  hasView?: string;
  lastResults?: SessionListing[];
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1_000;
let sessionStore: PluginStateSyncKeyedStore<UserSession> | undefined;

export function configureSessionMemory(store: PluginStateSyncKeyedStore<UserSession>) {
  sessionStore = store;
}

function getStore(): PluginStateSyncKeyedStore<UserSession> {
  if (!sessionStore) {
    throw new Error("Property-search session memory has not been initialized.");
  }
  return sessionStore;
}

function sessionKey(userId: string): string {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error("Property-search session requires a user id.");
  }
  return createHash("sha256").update(normalized).digest("hex");
}

export function getSession(userId: string): UserSession {
  const key = sessionKey(userId);
  const store = getStore();
  const existing = store.lookup(key);
  if (existing) {
    return existing;
  }
  const session: UserSession = {};
  store.register(key, session);
  return session;
}

export function updateSession(userId: string, updates: Partial<UserSession>) {
  const key = sessionKey(userId);
  const store = getStore();
  if (!store.update) {
    throw new Error("Property-search session storage does not support atomic updates.");
  }
  store.update(key, (current: UserSession | undefined) => ({ ...current, ...updates }), {
    ttlMs: SESSION_TTL_MS,
  });
}

export function clearSession(userId: string) {
  getStore().delete(sessionKey(userId));
}
