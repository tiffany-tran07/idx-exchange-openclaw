import { createHash } from "node:crypto";
import OpenAI from "openai";
import { query } from "../tools/mySQL_connector.js";
import { getCachedRagIndex, replaceCachedRagIndex } from "../tools/session_memory.js";

interface RagDocument {
  title: string;
  content: string;
}

interface IndexedChunk {
  source: string;
  chunk: string;
  embedding: number[];
}

interface CachedChunk extends Omit<IndexedChunk, "embedding"> {
  embeddingBase64: string;
}

interface EmbeddingResult {
  embedding: number[];
  promptTokens?: number;
}

interface SchemaRow {
  Field: string;
  Type: string;
  Null: string;
}

const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL ?? "gemini-embedding-001";
const CHAT_MODEL = process.env.RAG_CHAT_MODEL ?? "gemini-2.5-flash";
const MAX_QUERY_CHARS = 4_000;
const RAG_PROVIDER_TIMEOUT_MS = 8_000;
const RAG_SCHEMA_TIMEOUT_MS = 2_000;
const STATIC_DOCUMENTS: RagDocument[] = [
  {
    title: "Real Estate Data Analyst Primer",
    content:
      "DOM means Days on Market. Comps are similar recently sold properties used to estimate market value. " +
      "Escrow is a neutral arrangement holding money and documents until transaction conditions are met. " +
      "Cap rate is annual net operating income divided by property value or purchase price. " +
      "List-to-close ratio is ClosePrice divided by ListPrice times 100.",
  },
  {
    title: "Trestle Property metadata (RESO Data Dictionary 2.0)",
    content:
      "DaysOnMarket counts days according to local MLS rules. CloseDate is the fulfilled sale date; ClosePrice is the amount paid; " +
      "ListPrice is the seller and broker's current price; LivingArea is total livable area; BedroomsTotal and BathroomsTotalInteger are dwelling totals. " +
      "StandardStatus includes Active, Pending, Closed, Expired, Canceled, and Withdrawn. AssociationFee, PoolPrivateYN, YearBuilt, and City describe the property.",
  },
  {
    title: "IDX Exchange schema reference",
    content:
      "california_sold includes ListingKey, UnparsedAddress, City, CloseDate, ClosePrice, OriginalListPrice, ListPrice, DaysOnMarket, " +
      "BedroomsTotal, BathroomsTotalInteger, LivingArea, PropertyType, PropertySubType, YearBuilt, ListAgentFullName, ListOfficeName, and BuyerOfficeName. " +
      "In rets_property, L_SystemPrice is price, L_Keyword2 bedrooms, LM_Dec_3 bathrooms, LM_Int2_3 living area, L_City city, L_Address address, and L_Status listing status.",
  },
];

function createClient(): OpenAI {
  const apiKey = process.env.GEMINI_API_KEY_1;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_1 is not configured");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    maxRetries: 0,
    timeout: RAG_PROVIDER_TIMEOUT_MS,
  });
}

async function withTimeout<T>(operation: Promise<T>, fallback: T, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function chunkText(text: string, chunkSize = 600, overlap = 100): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += chunkSize - overlap) {
    chunks.push(text.slice(start, start + chunkSize));
  }
  return chunks;
}

async function loadDocuments(): Promise<RagDocument[]> {
  try {
    const columns = await query<SchemaRow>("SHOW COLUMNS FROM california_sold", []);
    const schema = columns
      .slice(0, 100)
      .map((column) => `${column.Field} (${column.Type}, nullable=${column.Null})`)
      .join("\n");
    return [
      ...STATIC_DOCUMENTS,
      { title: "Live california_sold database schema", content: `Current columns:\n${schema}` },
    ];
  } catch {
    return STATIC_DOCUMENTS;
  }
}

async function embeddings(client: OpenAI, texts: string[]): Promise<EmbeddingResult[]> {
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((text) => text.replaceAll("\n", " ").slice(0, 8_000)),
  });
  const promptTokens = response.usage?.prompt_tokens;
  return response.data.map((item, index) => ({
    embedding: item.embedding,
    promptTokens: index === 0 ? promptTokens : undefined,
  }));
}

async function embedding(client: OpenAI, text: string): Promise<EmbeddingResult> {
  return (await embeddings(client, [text]))[0] ?? { embedding: [] };
}

function encodeEmbedding(values: number[]): string {
  const buffer = Buffer.allocUnsafe(values.length * Float32Array.BYTES_PER_ELEMENT);
  values.forEach((value, index) => buffer.writeFloatLE(value, index * 4));
  return buffer.toString("base64");
}

function decodeEmbedding(value: string): number[] {
  const buffer = Buffer.from(value, "base64");
  const values: number[] = [];
  for (let offset = 0; offset + 4 <= buffer.length; offset += 4) {
    values.push(buffer.readFloatLE(offset));
  }
  return values;
}

async function loadIndex(
  client: OpenAI,
  documents: RagDocument[],
): Promise<{ index: IndexedChunk[]; promptTokens: number; cached: boolean }> {
  const corpusHash = createHash("sha256")
    .update(JSON.stringify({ model: EMBEDDING_MODEL, documents }))
    .digest("hex");
  let cached: CachedChunk[] | undefined;
  try {
    cached = getCachedRagIndex<CachedChunk[]>(corpusHash);
  } catch (error) {
    const detail = error instanceof Error ? error.message || error.name : String(error);
    console.warn(`RAG cache unavailable; continuing without persistent cache: ${detail}`);
  }
  if (cached) {
    return {
      index: cached.map((chunk) => ({
        source: chunk.source,
        chunk: chunk.chunk,
        embedding: decodeEmbedding(chunk.embeddingBase64),
      })),
      promptTokens: 0,
      cached: true,
    };
  }

  const index: IndexedChunk[] = [];
  const chunks = documents.flatMap((document) =>
    chunkText(document.content).map((chunk) => ({ source: document.title, chunk })),
  );
  const embeddedChunks = await embeddings(
    client,
    chunks.map(({ source, chunk }) => `${source}\n${chunk}`),
  );
  const indexedChunks = chunks.map(({ source, chunk }, index) => ({
    source,
    chunk,
    embedding: embeddedChunks[index]?.embedding ?? [],
    promptTokens: embeddedChunks[index]?.promptTokens,
  }));
  index.push(
    ...indexedChunks.map(({ source, chunk, embedding }) => ({ source, chunk, embedding })),
  );
  try {
    replaceCachedRagIndex(
      corpusHash,
      index.map((chunk) => ({
        source: chunk.source,
        chunk: chunk.chunk,
        embeddingBase64: encodeEmbedding(chunk.embedding),
      })),
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message || error.name : String(error);
    console.warn(`RAG cache unavailable; response will not be persisted: ${detail}`);
  }
  return {
    index,
    promptTokens: indexedChunks.reduce((total, chunk) => total + (chunk.promptTokens ?? 0), 0),
    cached: false,
  };
}

function cosineSimilarity(left: number[], right: number[]): number {
  let dot = 0;
  let leftSquared = 0;
  let rightSquared = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    dot += left[index]! * right[index]!;
    leftSquared += left[index]! ** 2;
    rightSquared += right[index]! ** 2;
  }
  const denominator = Math.sqrt(leftSquared) * Math.sqrt(rightSquared);
  return denominator === 0 ? 0 : dot / denominator;
}

export async function runRagAgent(queryText: string, _sessionId: string) {
  try {
    const boundedQuery = queryText.trim().slice(0, MAX_QUERY_CHARS);
    const client = createClient();
    const documents = await withTimeout(loadDocuments(), STATIC_DOCUMENTS, RAG_SCHEMA_TIMEOUT_MS);
    const loadedIndex = await loadIndex(client, documents);
    const queryEmbedding = await embedding(client, boundedQuery);
    const context = loadedIndex.index
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(queryEmbedding.embedding, chunk.embedding),
      }))
      .toSorted((left, right) => right.score - left.score)
      .slice(0, 4)
      .map(({ chunk }) => `SOURCE: ${chunk.source}\n${chunk.chunk}`)
      .join("\n\n");

    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 350,
      messages: [
        {
          role: "user",
          content:
            "Answer using only the source context. Cite source titles in square brackets. " +
            "If context is insufficient, say so plainly.\n\n" +
            `${context}\n\nQuestion: ${boundedQuery}`,
        },
      ],
    });
    console.info(
      `RAG token usage: ${JSON.stringify({
        index: loadedIndex.cached ? "cached" : "cold",
        indexPromptTokens: loadedIndex.promptTokens,
        queryEmbeddingPromptTokens: queryEmbedding.promptTokens,
        chatPromptTokens: response.usage?.prompt_tokens,
        chatCompletionTokens: response.usage?.completion_tokens,
        chatTotalTokens: response.usage?.total_tokens,
      })}`,
    );
    return {
      response:
        response.choices[0]?.message.content?.trim() ??
        "I don't have enough indexed information to answer that.",
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message || error.name : String(error);
    console.error(`RAG unavailable: ${detail}`);
    return { response: "I couldn't retrieve the real-estate reference material right now." };
  }
}
