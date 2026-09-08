import { runRagAgent } from "../agents/rag_agent.js";

async function main(): Promise<void> {
  const [question, sessionId] = process.argv.slice(2);
  if (!question?.trim() || !sessionId?.trim()) {
    console.error('Usage: node --import tsx src/tools/rag_cli.ts "<question>" "<conversation-id>"');
    process.exitCode = 2;
    return;
  }

  const result = await runRagAgent(question, sessionId);
  process.stdout.write(`${result.response.trim()}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`RAG request failed: ${message}`);
  process.exitCode = 1;
});
