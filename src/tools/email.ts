import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";

export type EmailWorkflow =
  | "listing_alert"
  | "market_report"
  | "property_summary"
  | "recommendation_digest";
export type EmailDraft = {
  approvalId: string;
  workflow: EmailWorkflow;
  to: string;
  subject: string;
  body: string;
  status: "pending_approval" | "approved";
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
});
const pendingDrafts = new Map<string, EmailDraft>();

function validateRecipient(to: string): string {
  const recipient = to.trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))
    throw new Error("A valid recipient email address is required.");
  return recipient;
}

/** Create a reviewable draft. This function never sends email. */
export async function draftEmail(
  to: string,
  subject: string,
  body: string,
  workflow: EmailWorkflow = "property_summary",
): Promise<EmailDraft> {
  const draft: EmailDraft = {
    approvalId: randomUUID(),
    workflow,
    to: validateRecipient(to),
    subject: subject.trim(),
    body,
    status: "pending_approval",
  };
  if (!draft.subject) throw new Error("An email subject is required.");
  pendingDrafts.set(draft.approvalId, draft);
  return draft;
}

/** Mark exactly one draft approved; delivery remains a separate operation. */
export function approveEmail(approvalId: string, confirmation: string): EmailDraft {
  if (confirmation.trim() !== "I approve sending this email")
    throw new Error("Explicit confirmation is required: I approve sending this email");
  const draft = pendingDrafts.get(approvalId.trim());
  if (!draft || draft.status !== "pending_approval")
    throw new Error("Email draft is missing, expired, or already approved.");
  const approved = { ...draft, status: "approved" as const };
  pendingDrafts.set(approved.approvalId, approved);
  return approved;
}

/** Send only a draft approved by approveEmail, then consume its approval. */
export async function sendApprovedEmail(draft: EmailDraft): Promise<void> {
  const stored = pendingDrafts.get(draft.approvalId);
  if (!stored || stored.status !== "approved" || draft.status !== "approved")
    throw new Error("Email has not received explicit human approval.");
  pendingDrafts.delete(draft.approvalId);
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: stored.to,
    subject: stored.subject,
    html: stored.body,
  });
}
