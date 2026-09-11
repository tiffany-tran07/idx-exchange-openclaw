---
name: property-search-orchestrator
description: Route housing requests through the OpenClaw property orchestrator, collect missing criteria, and preserve the canonical session state.
---

# Property Search Orchestrator

Use this skill for mixed, ambiguous, or multi-step real-estate requests. The
repository orchestrator classifies the request and selects the appropriate
workflow. It also owns the handoff between the property agents below.

## Agent map and required information

| Agent                           | Responsibility                                                                                                 | Information needed                                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `classifyIntent` / orchestrator | Classifies the request as `search`, `market`, `recommend`, `mixed`, or `knowledge`, then selects the workflow. | The user's complete current message and the canonical `sessionId`.                                                                                                     |
| Requirements Agent              | Extracts criteria, merges them into session memory, and reports missing search fields.                         | The user's search message, `sessionId`, and any previously saved criteria. A complete listing search requires `city`, `maxPrice`, `beds`, `baths`, `sqft`, and `type`. |
| Listing Agent                   | Queries active listings in `rets_property` and saves listing previews.                                         | A `sessionId` whose merged criteria contain all required fields from the Requirements Agent.                                                                           |
| Market Stats Agent              | Retrieves and saves trailing-12-month market statistics from `california_sold`.                                | The user's market message, `sessionId`, and a `city`. If the city is omitted from the message, it may use the saved session city.                                      |
| Recommendation Agent            | Ranks saved listing candidates by lower price, then larger square footage, and explains the result.            | A `sessionId` with saved `listingPreviews`; criteria are used to add context such as the city. Run a listing search first if no candidates are saved.                  |
| RAG Agent                       | Answers general real-estate knowledge questions using the property reference corpus and retrieval flow.        | The user's knowledge question and `sessionId`. It must not replace a deterministic listing, market, or recommendation workflow.                                        |
| Property Parser                 | Extracts structured criteria from natural-language housing requests.                                           | The current search or market message. It is called by the owning agent, never directly by the model.                                                                   |
| Session Memory                  | Persists criteria, listing previews, and market summaries for the current conversation.                        | The canonical `sessionId`; never substitute a user ID, sender ID, channel ID, or session key.                                                                          |

## Workflow

1. Read the canonical OpenClaw `sessionId` from the runtime context.
2. For live Gateway sessions, invoke the Gateway-managed `property_search`
   tool with the user's current message unchanged. The tool calls the shared
   `orchestrate(query, sessionId)` pipeline in-process, preserving the
   canonical session state and allowing the orchestrator to switch between
   requirements, listings, market stats, recommendations, and knowledge
   workflows.
3. Relay the property's workflow response directly to the user.
4. For isolated CLI smoke tests only, pass the user's current message and the
   `sessionId` as two separate CLI arguments and run:

   ```bash
   node --import tsx src/tools/orchestrate_cli.ts "<current message>" "<sessionId>"
   ```

   Use a separate test state directory/database; never run this CLI against
   the live Gateway-owned state.

5. When the workflow requests missing information, pass only the user's new
   message on the next turn. Use the same `sessionId`; saved criteria are
   recovered automatically.

## How to supply information

- For listing searches, collect the missing fields named by the Requirements
  Agent. Examples: city, maximum price, bedroom count, bathroom count, minimum
  square footage, and property type.
- For market reports, ask only for the city when it is missing. Do not require
  listing criteria.
- For recommendations, ask the user to run a listing search first when the
  session has no saved candidates.
- For mixed requests, preserve both intents. The orchestrator may collect
  listing criteria while also returning market context.
- For general knowledge, let the RAG Agent handle the question; do not invent
  search criteria just because the topic is real estate.

## Critical rules

- Never substitute a user ID, sender ID, channel ID, or session key for the
  canonical `sessionId`.
- Never invoke parser, listing, market, recommendation, or RAG modules directly.
- In live Gateway sessions, use the Gateway-managed `property_search` tool;
  do not launch `src/tools/orchestrate_cli.ts`.
- Never repeat saved criteria in later calls unless the user states them again.
- For isolated CLI smoke tests, shell-escape the message and `sessionId` so
  each remains one argument. If the command succeeds, relay its stdout,
  including requests for missing information or no-result responses.
- If the Gateway tool or isolated test command fails, tell the user the
  workflow could not complete; never fail silently.
- Pass `reset my property search` through unchanged when the user asks to
  discard the current conversation's property-search state.
