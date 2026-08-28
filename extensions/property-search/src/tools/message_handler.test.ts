import { describe, expect, it } from "vitest";
import { formatForWhatsApp } from "./message_handler.js";

describe("WhatsApp property response formatting", () => {
  it("preserves the complete canonical response for mixed results", () => {
    const response = "LISTING SUMMARY\n\nMARKET SUMMARY";

    expect(
      formatForWhatsApp({
        response,
      }),
    ).toBe(response);
  });
});
