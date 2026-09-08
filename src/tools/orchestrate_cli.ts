import { orchestrate } from "./orchestrate.js";

async function main(): Promise<void> {
  const [message, sessionId] = process.argv.slice(2);
  if (!message?.trim() || !sessionId?.trim()) {
    console.error(
      'Usage: node --import tsx src/tools/orchestrate_cli.ts "<message>" "<conversation-id>"',
    );
    process.exitCode = 2;
    return;
  }

  const result = await orchestrate(message, sessionId);
  process.stdout.write(`${result.response.trim()}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Real-estate workflow failed: ${message}`);
  process.exitCode = 1;
});
