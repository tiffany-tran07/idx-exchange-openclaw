import { beforeEach, describe, expect, it, vi } from "vitest";
import { withOpenClawTestState } from "../test-utils/openclaw-test-state.js";
import { runRagAgent } from "./rag_agent.js";

const mocks = vi.hoisted(() => ({
  complete: vi.fn(async () => ({
    choices: [{ message: { content: "Grounded answer [Real Estate Data Analyst Primer]" } }],
    usage: { prompt_tokens: 500, completion_tokens: 100, total_tokens: 600 },
  })),
  embed: vi.fn(async ({ input }: { input: string | string[] }) => {
    const count = Array.isArray(input) ? input.length : 1;
    return {
      data: Array.from({ length: count }, () => ({ embedding: [1, 0, 0] })),
      usage: { prompt_tokens: count * 100, total_tokens: count * 100 },
    };
  }),
  query: vi.fn(async () => {
    throw new Error("database unavailable in test");
  }),
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    embeddings = { create: mocks.embed };
    chat = { completions: { create: mocks.complete } };
  },
}));

vi.mock("../tools/mySQL_connector.js", () => ({ query: mocks.query }));

describe("real-estate RAG index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps cold-start token usage below the budget", async () => {
    await withOpenClawTestState(
      {
        label: "real-estate-rag-token-budget",
        applyEnv: true,
        env: { GEMINI_API_KEY_1: "test-key" },
      },
      async () => {
        await runRagAgent("What is escrow?", "rag-session-token-budget");

        const embeddingTokens = mocks.embed.mock.calls.reduce(
          (total, [request]) =>
            total + (Array.isArray(request.input) ? request.input.length : 1) * 100,
          0,
        );
        const chatTokens = 600;
        expect(embeddingTokens + chatTokens).toBeLessThan(15_000);
      },
    );
  });

  it("uses cached document embeddings on the repeat request", async () => {
    await withOpenClawTestState(
      {
        label: "real-estate-rag-index",
        applyEnv: true,
        env: { GEMINI_API_KEY_1: "test-key" },
      },
      async () => {
        await runRagAgent("What is DOM?", "rag-session-a");
        const firstRequestEmbeddingCalls = mocks.embed.mock.calls.length;

        await runRagAgent("Explain escrow", "rag-session-b");

        expect(firstRequestEmbeddingCalls).toBe(2);
        expect(mocks.embed.mock.calls.length).toBe(firstRequestEmbeddingCalls + 1);
        expect(mocks.complete).toHaveBeenCalledTimes(2);
      },
    );
  });

  it("falls back to static sources when the optional schema lookup stalls", async () => {
    mocks.query.mockImplementationOnce(() => new Promise<never>(() => {}));

    await withOpenClawTestState(
      {
        label: "real-estate-rag-schema-timeout",
        applyEnv: true,
        env: { GEMINI_API_KEY_1: "test-key" },
      },
      async () => {
        vi.useFakeTimers();
        try {
          const resultPromise = runRagAgent("What is escrow?", "rag-session-timeout");
          await vi.advanceTimersByTimeAsync(2_000);
          await expect(resultPromise).resolves.toEqual({
            response: "Grounded answer [Real Estate Data Analyst Primer]",
          });
        } finally {
          vi.useRealTimers();
        }
      },
    );
  });
});
