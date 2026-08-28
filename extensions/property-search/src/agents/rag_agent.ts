import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

type PendingRequest = {
  resolve: (response: string) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

const TOOL_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tools");
const pending: PendingRequest[] = [];
let worker: ChildProcessWithoutNullStreams | undefined;

function rejectPending(error: Error) {
  for (const request of pending.splice(0)) {
    clearTimeout(request.timeout);
    request.reject(error);
  }
}

function startWorker(): ChildProcessWithoutNullStreams {
  if (worker && worker.exitCode === null) {
    return worker;
  }

  const child = spawn("python3", ["RAG.py", "--serve"], {
    cwd: TOOL_DIRECTORY,
    stdio: ["pipe", "pipe", "pipe"],
  });
  worker = child;

  readline.createInterface({ input: child.stdout }).on("line", (line) => {
    const request = pending.shift();
    if (!request) {
      return;
    }
    clearTimeout(request.timeout);
    try {
      const result = JSON.parse(line) as { response?: unknown; error?: unknown };
      if (typeof result.response === "string") {
        request.resolve(result.response);
      } else {
        request.reject(new Error(String(result.error ?? "RAG worker returned no response.")));
      }
    } catch (error) {
      request.reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
  child.stderr.on("data", (data) => console.error(`RAG worker: ${String(data).trim()}`));
  child.on("error", (error) => rejectPending(error));
  child.on("exit", (code) => {
    if (worker === child) {
      worker = undefined;
    }
    rejectPending(new Error(`RAG worker exited with code ${code ?? "unknown"}.`));
  });

  return child;
}

async function askWorker(query: string): Promise<string> {
  const child = startWorker();
  return await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      rejectPending(new Error("RAG worker timed out."));
    }, 120_000);
    timeout.unref?.();
    pending.push({ resolve, reject, timeout });
    child.stdin.write(`${JSON.stringify({ query })}\n`, (error) => {
      if (error) {
        rejectPending(error);
      }
    });
  });
}

export async function runRagAgent(query: string, _userId: string) {
  try {
    return { response: await askWorker(query) };
  } catch (error) {
    console.error("RAG Agent error:", error);
    return {
      response: "I'm sorry, I encountered an issue retrieving real estate knowledge.",
    };
  }
}

export function closeRagWorker() {
  worker?.kill();
  worker = undefined;
}
