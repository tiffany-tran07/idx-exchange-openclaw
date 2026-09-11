import { describe, expect, it } from "vitest";
import { createEmailWorkflowTools } from "./email-workflow-tools.js";

describe("property email tool catalog visibility", () => {
  it("defers draft schemas while keeping approval directly visible", () => {
    const tools = createEmailWorkflowTools("session-1");

    expect(tools.find((tool) => tool.name === "email_draft")?.catalogMode).toBeUndefined();
    expect(tools.find((tool) => tool.name === "email_approve")?.catalogMode).toBe("direct-only");
  });
});
