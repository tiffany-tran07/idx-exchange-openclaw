import { describe, expect, it, vi } from "vitest";
import { createMemorySessionStore } from "./test/session-store.js";

const handlerMock = vi.hoisted(() => vi.fn());
vi.mock("./src/tools/message_handler.js", () => ({ onWhatsAppMessage: handlerMock }));
vi.mock("./src/agents/rag_agent.js", () => ({ closeRagWorker: vi.fn() }));

import plugin from "./index.js";

describe("property-search plugin", () => {
  it("answers WhatsApp before the general agent is dispatched", async () => {
    handlerMock.mockResolvedValue("What is your maximum price?");
    type BeforeDispatch = (
      event: { content: string; body?: string },
      context: { channelId?: string; senderId?: string },
    ) => Promise<unknown>;
    let beforeDispatch: BeforeDispatch | undefined;
    const api = {
      runtime: {
        state: {
          openSyncKeyedStore: vi.fn(() => createMemorySessionStore()),
        },
      },
      on: vi.fn((name: string, handler: BeforeDispatch) => {
        if (name === "before_dispatch") {
          beforeDispatch = handler;
        }
      }),
      registerService: vi.fn(),
    };

    plugin.register(api as never);
    const result = await beforeDispatch?.(
      { content: "2 bedroom houses in San Francisco" },
      { channelId: "whatsapp", senderId: "+14155550123" },
    );

    expect(handlerMock).toHaveBeenCalledWith("2 bedroom houses in San Francisco", "+14155550123");
    expect(result).toEqual({ handled: true, text: "What is your maximum price?" });
  });
});
