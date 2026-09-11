import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail } = vi.hoisted(() => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

import { approveEmail, draftEmail, sendApprovedEmail } from "./email.js";

describe("property email approval boundary", () => {
  beforeEach(() => sendMail.mockClear());

  it("creates a pending draft without sending", async () => {
    const draft = await draftEmail(
      "buyer@example.com",
      "Alert",
      "<p>New home</p>",
      "listing_alert",
    );

    expect(draft).toMatchObject({
      to: "buyer@example.com",
      status: "pending_approval",
      workflow: "listing_alert",
    });
    expect(draft.approvalId).toEqual(expect.any(String));
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rejects delivery without the exact human confirmation", async () => {
    const draft = await draftEmail("buyer@example.com", "Alert", "<p>New home</p>");

    expect(() => approveEmail(draft.approvalId, "yes, send it")).toThrow("Explicit confirmation");
    await expect(sendApprovedEmail({ ...draft, status: "approved" })).rejects.toThrow(
      "explicit human approval",
    );
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends an approved draft once and consumes the approval", async () => {
    const draft = await draftEmail("buyer@example.com", "Alert", "<p>New home</p>");
    const approved = approveEmail(draft.approvalId, "I approve sending this email");

    await sendApprovedEmail(approved);
    expect(sendMail).toHaveBeenCalledOnce();
    await expect(sendApprovedEmail(approved)).rejects.toThrow("explicit human approval");
  });
});
