import { createCorePluginStateSyncKeyedStore } from "../plugin-state/plugin-state-store.js";

export interface PropertyCriteria {
  city?: string;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  type?: string;
  pool?: boolean;
}

export interface ListingPreview {
  id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
}

export interface MarketSummary {
  city: string;
  period: string;
  soldCount: number;
  averagePrice: number;
  pricePerSqft: number;
  daysOnMarket: number;
  listToCloseRatio: number;
}

export interface PropertySession {
  criteria: PropertyCriteria;
  listingPreviews: ListingPreview[];
  marketSummary?: MarketSummary;
  updatedAt: string;
}

export interface PropertySessionPatch {
  criteria?: Partial<PropertyCriteria>;
  listingPreviews?: ListingPreview[];
  marketSummary?: MarketSummary | null;
}

const SESSION_TTL_MS = 30 * 60 * 1000;
const OWNER_ID = "core:real-estate-workflow" as const;
const sessionStore = createCorePluginStateSyncKeyedStore<PropertySession>({
  ownerId: OWNER_ID,
  namespace: "sessions",
  maxEntries: 500,
  overflowPolicy: "evict-oldest",
  defaultTtlMs: SESSION_TTL_MS,
  env: process.env,
});
const ragIndexStore = createCorePluginStateSyncKeyedStore<unknown>({
  ownerId: OWNER_ID,
  namespace: "rag-index",
  maxEntries: 128,
  overflowPolicy: "evict-oldest",
  env: process.env,
});

function assertSessionId(sessionId: string): string {
  const normalized = sessionId.trim();
  if (!normalized) {
    throw new Error("A conversation/session ID is required.");
  }
  if (Buffer.byteLength(normalized) > 512) {
    throw new Error("The conversation/session ID is too long.");
  }
  return normalized;
}

function emptySession(now = Date.now()): PropertySession {
  return {
    criteria: {},
    listingPreviews: [],
    updatedAt: new Date(now).toISOString(),
  };
}

export function getSession(sessionId: string): PropertySession {
  const key = assertSessionId(sessionId);
  let session: PropertySession | undefined;
  sessionStore.update?.(key, (current) => {
    if (!current) {
      return undefined;
    }
    session = { ...current, updatedAt: new Date().toISOString() };
    return session;
  });
  if (!session) {
    return emptySession();
  }
  return session;
}

export function updateSession(sessionId: string, patch: PropertySessionPatch): PropertySession {
  const key = assertSessionId(sessionId);
  let updated: PropertySession | undefined;
  const wrote = sessionStore.update?.(key, (current) => {
    const existing = current ?? emptySession();
    const criteria = Object.fromEntries(
      Object.entries({ ...existing.criteria, ...patch.criteria }).filter(
        ([, value]) => value !== undefined,
      ),
    ) as PropertyCriteria;
    const previousCity = existing.criteria.city?.trim().toLowerCase();
    const nextCity = criteria.city?.trim().toLowerCase();
    const cityChanged = previousCity !== nextCity;
    updated = {
      criteria,
      listingPreviews: patch.listingPreviews ?? (cityChanged ? [] : existing.listingPreviews),
      ...(patch.marketSummary !== undefined
        ? patch.marketSummary
          ? { marketSummary: patch.marketSummary }
          : {}
        : cityChanged
          ? {}
          : existing.marketSummary
            ? { marketSummary: existing.marketSummary }
            : {}),
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });
  if (!wrote || !updated) {
    throw new Error("Failed to update the property-search session.");
  }
  return updated;
}

export function clearSession(sessionId: string): void {
  sessionStore.delete(assertSessionId(sessionId));
}

export function getCachedRagIndex<T>(corpusHash: string): T | undefined {
  const manifest = ragIndexStore.lookup(`manifest:${corpusHash}`) as
    | { chunkCount?: unknown }
    | undefined;
  if (!manifest || !Number.isSafeInteger(manifest.chunkCount)) {
    return undefined;
  }
  const chunks: unknown[] = [];
  for (let index = 0; index < Number(manifest.chunkCount); index += 1) {
    const chunk = ragIndexStore.lookup(`chunk:${corpusHash}:${index}`);
    if (!chunk) {
      return undefined;
    }
    chunks.push(chunk);
  }
  return chunks as T;
}

export function replaceCachedRagIndex(corpusHash: string, index: unknown): void {
  if (!Array.isArray(index)) {
    throw new Error("A RAG index must be an array of chunks.");
  }
  ragIndexStore.clear();
  index.forEach((chunk, chunkIndex) => {
    ragIndexStore.register(`chunk:${corpusHash}:${chunkIndex}`, chunk);
  });
  ragIndexStore.register(`manifest:${corpusHash}`, { chunkCount: index.length });
}
