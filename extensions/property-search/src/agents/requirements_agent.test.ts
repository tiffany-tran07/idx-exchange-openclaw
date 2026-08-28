import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { createMemorySessionStore } from "../../test/session-store.js";
import { parsePropertyQuery } from "../tools/property_parser.js";
import { clearSession, configureSessionMemory } from "../tools/session_memory.js";
import { runRequirementsAgent } from "./requirements_agent.js";

const USER_ID = "requirements-test";
configureSessionMemory(createMemorySessionStore());

describe("property search requirements", () => {
  afterEach(() => clearSession(USER_ID));

  it("requests every missing core search field", async () => {
    await expect(
      runRequirementsAgent("2 bedroom houses in San Francisco", USER_ID),
    ).resolves.toEqual({
      isComplete: false,
      missingFields: ["maxPrice"],
    });
  });

  it("requests a city when no search location is available", async () => {
    await expect(runRequirementsAgent("Show me 2 bedroom houses", USER_ID)).resolves.toEqual({
      isComplete: false,
      missingFields: ["city", "maxPrice"],
    });
  });

  it("parses natural house and million-dollar criteria", async () => {
    await expect(
      parsePropertyQuery("Show me 2 bedroom houses in San Francisco under 1.5 million"),
    ).resolves.toMatchObject({
      city: "San Francisco",
      maxPrice: 1_500_000,
      beds: 2,
      type: "SingleFamilyResidence",
    });
  });

  it("does not run a command-line routine when the parser is imported", () => {
    const run = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--eval",
        'await import("./extensions/property-search/src/tools/property_parser.ts"); process.stdout.write("IMPORT_OK");',
      ],
      { cwd: process.cwd(), encoding: "utf8", timeout: 10_000 },
    );

    expect(run.error).toBeUndefined();
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toBe("IMPORT_OK");
  });
});
