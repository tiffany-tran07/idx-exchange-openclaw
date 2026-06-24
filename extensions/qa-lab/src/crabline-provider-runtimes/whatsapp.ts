// Qa Lab plugin module implements WhatsApp-specific Crabline provider runtime setup.
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { appendNodeOption } from "./shared.js";
import type { QaCrablineProviderRuntime, QaStartedOpenClawCrablineAdapter } from "./types.js";
import { WHATSAPP_FAKE_PROVIDER_PRELOAD_SOURCE } from "./whatsapp-preload.js";

async function stageWhatsAppAuthDir(params: {
  adapter: QaStartedOpenClawCrablineAdapter;
  outputDir: string;
}): Promise<string> {
  const selfJid = params.adapter.manifest.selfJid?.trim() || "15550000000@s.whatsapp.net";
  const authDir = path.join(params.outputDir, "artifacts", "crabline", "whatsapp-auth");
  await fs.mkdir(authDir, { recursive: true, mode: 0o700 });
  await fs.writeFile(
    path.join(authDir, "creds.json"),
    `${JSON.stringify({ me: { id: selfJid } }, null, 2)}\n`,
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );
  return authDir;
}

async function stageWhatsAppPreload(outputDir: string): Promise<string> {
  const preloadPath = path.join(outputDir, "artifacts", "crabline", "whatsapp-preload.mjs");
  await fs.mkdir(path.dirname(preloadPath), { recursive: true });
  await fs.writeFile(preloadPath, WHATSAPP_FAKE_PROVIDER_PRELOAD_SOURCE, {
    encoding: "utf8",
    mode: 0o600,
  });
  return preloadPath;
}

export const WHATSAPP_QA_CRABLINE_PROVIDER_RUNTIME: QaCrablineProviderRuntime = {
  channel: "whatsapp",
  async setup({ adapter, outputDir }) {
    const authDir = await stageWhatsAppAuthDir({ adapter, outputDir });
    const preloadPath = await stageWhatsAppPreload(outputDir);
    return {
      augmentGatewayConfig(config) {
        const channels = config.channels ?? {};
        const whatsapp = channels.whatsapp ?? {};
        const accounts = whatsapp.accounts ?? {};
        const accountConfig = accounts[adapter.accountId] ?? {};
        return {
          ...config,
          channels: {
            ...channels,
            whatsapp: {
              ...whatsapp,
              accounts: {
                ...accounts,
                [adapter.accountId]: {
                  ...accountConfig,
                  authDir,
                  enabled: true,
                },
              },
            },
          },
        };
      },
      createRuntimeEnvPatch() {
        const {
          CRABLINE_WHATSAPP_ACCESS_TOKEN,
          CRABLINE_WHATSAPP_ADMIN_TOKEN: _adminToken,
          CRABLINE_WHATSAPP_API_ROOT,
          CRABLINE_WHATSAPP_SELF_JID,
          ...rest
        } = adapter.createChannelDriverSmokeEnv({});
        return {
          ...rest,
          NODE_OPTIONS: appendNodeOption(
            process.env.NODE_OPTIONS,
            `--import=${pathToFileURL(preloadPath).href}`,
          ),
          OPENCLAW_WHATSAPP_FAKE_PROVIDER_ACCESS_TOKEN: CRABLINE_WHATSAPP_ACCESS_TOKEN,
          OPENCLAW_WHATSAPP_FAKE_PROVIDER_ACCOUNT_ID: adapter.accountId,
          OPENCLAW_WHATSAPP_FAKE_PROVIDER_API_ROOT: CRABLINE_WHATSAPP_API_ROOT,
          OPENCLAW_WHATSAPP_FAKE_PROVIDER_SELF_JID: CRABLINE_WHATSAPP_SELF_JID,
        };
      },
    };
  },
};
