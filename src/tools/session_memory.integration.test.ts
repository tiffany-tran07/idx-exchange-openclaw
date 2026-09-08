import { execFile } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { withOpenClawTestState } from "../test-utils/openclaw-test-state.js";

const execFileAsync = promisify(execFile);

async function runSessionProcess(params: {
  stateDir: string;
  operation: "clear" | "get" | "seed";
  sessionId: string;
}): Promise<string> {
  const moduleUrl = pathToFileURL(path.resolve("src/tools/session_memory.ts")).href;
  const script = `
    import { clearSession, getSession, updateSession } from ${JSON.stringify(moduleUrl)};
    const [operation, sessionId] = process.argv.slice(1);
    if (operation === "seed") {
      updateSession(sessionId, {
        criteria: { city: "Irvine", beds: 3 },
        listingPreviews: [{
          id: "listing-1",
          address: "1 Main Street",
          price: 900000,
          beds: 3,
          baths: 2,
          sqft: 1600,
        }],
        marketSummary: {
          city: "Irvine",
          period: "Trailing 12 months",
          soldCount: 20,
          averagePrice: 950000,
          pricePerSqft: 600,
          daysOnMarket: 18,
          listToCloseRatio: 99,
        },
      });
    } else if (operation === "clear") {
      clearSession(sessionId);
    }
    process.stdout.write(JSON.stringify(getSession(sessionId)));
  `;
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      script,
      params.operation,
      params.sessionId,
    ],
    {
      cwd: path.resolve("."),
      env: { ...process.env, OPENCLAW_STATE_DIR: params.stateDir },
    },
  );
  return stdout;
}

async function runCli(stateDir: string, message: string, sessionId: string): Promise<string> {
  const { stdout } = await execFileAsync(
    process.execPath,
    ["--import", "tsx", "src/tools/orchestrate_cli.ts", message, sessionId],
    {
      cwd: path.resolve("."),
      env: { ...process.env, OPENCLAW_STATE_DIR: stateDir },
    },
  );
  return stdout.trim();
}

describe("real-estate session persistence", () => {
  it("recovers accumulated criteria when the CLI runs in separate processes", async () => {
    await withOpenClawTestState({ label: "real-estate-cli-processes" }, async (state) => {
      const first = await runCli(state.stateDir, "Find a condo in Irvine", "cli-conversation-a");
      const second = await runCli(
        state.stateDir,
        "Under $900k with 3 beds and 2 baths",
        "cli-conversation-a",
      );
      const isolated = await runCli(
        state.stateDir,
        "Under $900k with 3 beds and 2 baths",
        "cli-conversation-b",
      );

      expect(first).toContain("maxPrice, beds, baths, sqft");
      expect(second).toContain("I still need: sqft");
      expect(isolated).toContain("city");
      expect(isolated).toContain("type");

      expect(await runCli(state.stateDir, "reset my property search", "cli-conversation-a")).toBe(
        "Your property search has been reset for this conversation.",
      );
      const afterReset = await runCli(
        state.stateDir,
        "Under $900k with 3 beds and 2 baths",
        "cli-conversation-a",
      );
      expect(afterReset).toContain("city");
      expect(afterReset).toContain("type");
    });
  });

  it("persists compact state across processes and isolates conversation IDs", async () => {
    await withOpenClawTestState({ label: "real-estate-session-processes" }, async (state) => {
      const sessionId = "conversation-a";
      await runSessionProcess({ stateDir: state.stateDir, operation: "seed", sessionId });
      const recommendation = await runCli(
        state.stateDir,
        "Which property do you recommend?",
        sessionId,
      );

      const recovered = JSON.parse(
        await runSessionProcess({ stateDir: state.stateDir, operation: "get", sessionId }),
      );
      const isolated = JSON.parse(
        await runSessionProcess({
          stateDir: state.stateDir,
          operation: "get",
          sessionId: "conversation-b",
        }),
      );

      expect(recovered.criteria).toMatchObject({ city: "Irvine", beds: 3 });
      expect(recovered.listingPreviews).toHaveLength(1);
      expect(recovered.marketSummary.city).toBe("Irvine");
      expect(recommendation).toContain("1 Main Street");
      expect(recommendation).toContain("saved candidate");
      expect(isolated.criteria).toEqual({});
      expect(isolated.listingPreviews).toEqual([]);
      expect(isolated.marketSummary).toBeUndefined();
    });
  });

  it("clears dependent results when the city changes and deletes state on reset", async () => {
    await withOpenClawTestState({ label: "real-estate-session-reset" }, async (state) => {
      const sessionId = "conversation-reset";
      await runSessionProcess({ stateDir: state.stateDir, operation: "seed", sessionId });

      const moduleUrl = pathToFileURL(path.resolve("src/tools/session_memory.ts")).href;
      const cityChangeScript = `
        import { getSession, updateSession } from ${JSON.stringify(moduleUrl)};
        updateSession(process.argv[1], { criteria: { city: "Anaheim" } });
        process.stdout.write(JSON.stringify(getSession(process.argv[1])));
      `;
      const { stdout } = await execFileAsync(
        process.execPath,
        ["--import", "tsx", "--input-type=module", "--eval", cityChangeScript, sessionId],
        { cwd: path.resolve("."), env: { ...process.env, OPENCLAW_STATE_DIR: state.stateDir } },
      );
      const changed = JSON.parse(stdout);
      expect(changed.criteria).toMatchObject({ city: "Anaheim", beds: 3 });
      expect(changed.listingPreviews).toEqual([]);
      expect(changed.marketSummary).toBeUndefined();

      await runSessionProcess({ stateDir: state.stateDir, operation: "clear", sessionId });
      const reset = JSON.parse(
        await runSessionProcess({ stateDir: state.stateDir, operation: "get", sessionId }),
      );
      expect(reset.criteria).toEqual({});
      expect(reset.listingPreviews).toEqual([]);
      expect(reset.marketSummary).toBeUndefined();
    });
  });
});
