import { orchestrate } from "./orchestrate.js";

type OrchestratorResult = Awaited<ReturnType<typeof orchestrate>>;

const FALLBACK_REPLY =
  "I couldn't find a result for that request. Try adding a city or price range.";
const ERROR_REPLY = "Sorry, I couldn't process that request. Please try again.";

function readText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function formatForWhatsApp(result: OrchestratorResult): string {
  return readText(result.response) ?? FALLBACK_REPLY;
}

export async function onWhatsAppMessage(message: string, userId: string): Promise<string> {
  const query = message.trim();
  const sender = userId.trim();
  if (!query) {
    return "Send a real estate question or describe the home you want to find.";
  }
  if (!sender) {
    return ERROR_REPLY;
  }

  try {
    return formatForWhatsApp(await orchestrate(query, sender));
  } catch (error) {
    console.error("WhatsApp orchestration failed", error);
    return ERROR_REPLY;
  }
}
