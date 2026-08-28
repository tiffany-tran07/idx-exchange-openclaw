import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { closeRagWorker } from "./src/agents/rag_agent.js";
import { onWhatsAppMessage } from "./src/tools/message_handler.js";
import { closeDatabase } from "./src/tools/mySQL_connector.js";
import { configureSessionMemory, type UserSession } from "./src/tools/session_memory.js";

export default definePluginEntry({
  id: "property-search",
  name: "Property Search",
  description: "Direct WhatsApp property search, market analytics, and real-estate RAG",
  register(api) {
    configureSessionMemory(
      api.runtime.state.openSyncKeyedStore<UserSession>({
        namespace: "sessions",
        maxEntries: 10_000,
        defaultTtlMs: 24 * 60 * 60 * 1_000,
      }),
    );

    api.on("before_dispatch", async (event, context) => {
      if (context.channelId !== "whatsapp") {
        return;
      }

      const senderId = context.senderId?.trim();
      if (!senderId) {
        return {
          handled: true,
          text: "Sorry, I couldn't identify this WhatsApp conversation. Please try again.",
        };
      }

      return {
        handled: true,
        text: await onWhatsAppMessage(event.body ?? event.content, senderId),
      };
    });

    api.registerService({
      id: "property-search-rag-worker",
      start: () => {},
      stop: async () => {
        closeRagWorker();
        await closeDatabase();
      },
    });
  },
});
