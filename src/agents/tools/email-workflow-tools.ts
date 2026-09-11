import { Type } from "typebox";
import { searchActiveListings } from "../../tools/active_listing_search.js";
import { getMarketSummary } from "../../tools/city_market_summary.js";
import {
  draftEmail,
  approveEmail,
  sendApprovedEmail,
  type EmailWorkflow,
} from "../../tools/email.js";
import { classifyIntent } from "../../tools/orchestrate.js";
import { getSession } from "../../tools/session_memory.js";
import { getSoldComps } from "../../tools/sold_comps_search.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readToolStringParam, ToolInputError } from "./common.js";

const DraftSchema = Type.Object({
  workflow: Type.Union([
    Type.Literal("listing_alert"),
    Type.Literal("market_report"),
    Type.Literal("property_summary"),
    Type.Literal("recommendation_digest"),
  ]),
  query: Type.String({
    description: "The user's housing-related request that justifies this email.",
  }),
  to: Type.String({ description: "Recipient email address." }),
  city: Type.Optional(Type.String({ description: "City for a market report." })),
  address: Type.Optional(Type.String({ description: "Address for a property summary." })),
  price: Type.Optional(Type.Number()),
  photos: Type.Optional(Type.Array(Type.String())),
});
const ApproveSchema = Type.Object({
  approval_id: Type.String({ description: "Approval ID returned by email_draft." }),
  confirmation: Type.String({ description: "Must be: I approve sending this email" }),
});
const money = (value: number) => `$${value.toLocaleString("en-US")}`;

async function buildDraft(params: Record<string, unknown>, sessionId: string) {
  const workflow = params.workflow as EmailWorkflow;
  const to = readToolStringParam(params, "to", { required: true });
  const query = readToolStringParam(params, "query", { required: true });
  const intent = await classifyIntent(query);
  if (intent === "knowledge") {
    throw new ToolInputError(
      "Email workflows only support housing requests involving listings, market data, or property recommendations.",
    );
  }
  const session = getSession(sessionId);
  const city = (params.city as string | undefined)?.trim() || session.criteria.city;
  if (workflow === "listing_alert") {
    if (!session.criteria.city) {
      throw new ToolInputError(
        "A saved property search with a city is required for listing alerts.",
      );
    }
    const listings = await searchActiveListings(session.criteria);
    return draftEmail(
      to,
      "New listing alert",
      `<h2>New listings matching your saved search</h2><ul>${listings.map((listing) => `<li><strong>${listing.address}</strong> — ${money(Number(listing.price))}</li>`).join("")}</ul>`,
      workflow,
    );
  }
  if (!city) throw new ToolInputError("A city is required for this email workflow.");
  if (workflow === "market_report") {
    const summary = await getMarketSummary(city);
    if (!summary) throw new ToolInputError(`No market data found for ${city}.`);
    const body = `<h2>${summary.city} market report</h2><p>${summary.period}</p><ul><li>Sales: ${summary.soldCount}</li><li>Average price: ${money(summary.averagePrice)}</li><li>Price/sqft: ${money(summary.pricePerSqft)}</li><li>Days on market: ${summary.daysOnMarket}</li></ul>`;
    return draftEmail(to, `${city} weekly market report`, body, workflow);
  }
  if (workflow === "recommendation_digest") {
    const body = `<h2>Your property recommendations</h2><ul>${session.listingPreviews.map((listing) => `<li><strong>${listing.address}</strong> — ${money(Number(listing.price))}, ${listing.beds}bd/${listing.baths}ba</li>`).join("")}</ul>`;
    return draftEmail(to, "Your property recommendations", body, workflow);
  }
  const address = readToolStringParam(params, "address", { required: true });
  const price = typeof params.price === "number" ? money(params.price) : "Price unavailable";
  const comps = await getSoldComps(city, 12);
  const photos = Array.isArray(params.photos)
    ? params.photos.map((photo) => `<img src="${String(photo)}" alt="Property photo" />`).join("")
    : "";
  const body = `<h2>${address}</h2><p>${price}</p>${photos}<h3>Recent comparable sales</h3><ul>${comps
    .slice(0, 5)
    .map((comp) => `<li>${comp.UnparsedAddress} — ${money(Number(comp.ClosePrice))}</li>`)
    .join("")}</ul>`;
  return draftEmail(to, `Property summary: ${address}`, body, workflow);
}

export function createEmailWorkflowTools(sessionId?: string): AnyAgentTool[] {
  return [
    {
      label: "Draft Property Email",
      name: "email_draft",
      displaySummary: "Prepare a property email for human review.",
      description:
        "Draft listing alerts, market reports, property summaries, or recommendation digests. Never sends email.",
      parameters: DraftSchema,
      execute: async (_toolCallId, rawArgs) => {
        if (!sessionId?.trim())
          throw new ToolInputError("Email workflows require the current session.");
        return jsonResult(await buildDraft(rawArgs as Record<string, unknown>, sessionId));
      },
    },
    {
      label: "Approve Property Email",
      name: "email_approve",
      catalogMode: "direct-only",
      displaySummary: "Send an email after explicit human confirmation.",
      description:
        "Send exactly one previously drafted property email only when the user supplies the exact confirmation phrase.",
      parameters: ApproveSchema,
      execute: async (_toolCallId, rawArgs) => {
        const params = rawArgs as Record<string, unknown>;
        const approved = approveEmail(
          readToolStringParam(params, "approval_id", { required: true }),
          readToolStringParam(params, "confirmation", { required: true }),
        );
        await sendApprovedEmail(approved);
        return jsonResult({ status: "sent", workflow: approved.workflow, to: approved.to });
      },
    },
  ];
}
