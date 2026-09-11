import { Type } from "typebox";
import { classifyIntent, orchestrate } from "../../tools/orchestrate.js";
import type { AnyAgentTool } from "./common.js";
import { readToolStringParam, textResult, ToolInputError } from "./common.js";

const PropertySearchToolSchema = Type.Object(
  {
    query: Type.String({ description: "The user's property-search request." }),
  },
  { additionalProperties: false },
);

/**
 * Runs the housing workflow inside the Gateway process so session memory uses
 * the Gateway-owned state connection instead of a competing CLI process.
 */
export function createPropertySearchTool(sessionId?: string): AnyAgentTool {
  return {
    label: "Property Search",
    name: "property_search",
    // Omit catalogMode so the normal OpenClaw Tool Search path can defer this
    // schema. Only direct-only tools are retained in every model payload.
    displaySummary: "Search active housing listings from the user's criteria.",
    description:
      "Run the deterministic property-search workflow for requests containing a location, price, bedrooms, bathrooms, square footage, listing, house, condo, townhome, or townhouse. Use this tool instead of RAG. It stores criteria and listing previews in the current OpenClaw session.",
    parameters: PropertySearchToolSchema,
    execute: async (_toolCallId, rawArgs) => {
      if (!sessionId?.trim()) {
        throw new ToolInputError("Property search requires the current OpenClaw session.");
      }
      const params = rawArgs as Record<string, unknown>;
      const query = readToolStringParam(params, "query", { required: true });
      if ((await classifyIntent(query)) === "knowledge") {
        throw new ToolInputError(
          "This tool accepts property searches, not general knowledge questions.",
        );
      }
      const intent = await classifyIntent(query);
      const result = await orchestrate(query, sessionId, intent);
      return textResult(result.response, {
        status: "ok",
        intent: "property_search",
      });
    },
  };
}
