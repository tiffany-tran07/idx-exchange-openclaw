import * as readline from "readline";
import { orchestrate } from "./src/tools/orchestrate.ts";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const userId = "manual_tester";

console.log("--- Orchestrator Interactive Shell ---");
console.log("Ready. Type your queries (e.g., 'Find me a house in San Francisco').");
console.log("Type 'exit' to quit.\n");

rl.setPrompt("> ");
rl.prompt();

rl.on("line", async (line) => {
  if (line.trim().toLowerCase() === "exit") {
    process.exit(0);
  }

  try {
    // The orchestrator returns an object.
    // We expect { response: string, ... }
    const result = await orchestrate(line, userId);
    console.log(`\nAgent: ${result.response}`);

    if (result.action === "request_missing_info") {
      console.log(`(Missing fields: ${result.missing.join(", ")})`);
    }
  } catch (error) {
    console.error("Error executing orchestrator:", error);
  }

  console.log("");
  rl.prompt();
});
