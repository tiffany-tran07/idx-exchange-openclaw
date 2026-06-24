// Qa Lab plugin module resolves Crabline provider runtime setup.
import { createDefaultCrablineProviderRuntimeSetup } from "./shared.js";
import { SLACK_QA_CRABLINE_PROVIDER_RUNTIME } from "./slack.js";
import type { QaCrablineProviderChannel, QaCrablineProviderRuntime } from "./types.js";
import { WHATSAPP_QA_CRABLINE_PROVIDER_RUNTIME } from "./whatsapp.js";

const TELEGRAM_QA_CRABLINE_PROVIDER_RUNTIME: QaCrablineProviderRuntime = {
  channel: "telegram",
  async setup({ adapter }) {
    return createDefaultCrablineProviderRuntimeSetup(adapter);
  },
};

const QA_CRABLINE_PROVIDER_RUNTIMES = {
  slack: SLACK_QA_CRABLINE_PROVIDER_RUNTIME,
  telegram: TELEGRAM_QA_CRABLINE_PROVIDER_RUNTIME,
  whatsapp: WHATSAPP_QA_CRABLINE_PROVIDER_RUNTIME,
} satisfies Record<QaCrablineProviderChannel, QaCrablineProviderRuntime>;

export function getQaCrablineProviderRuntime(
  channel: QaCrablineProviderChannel,
): QaCrablineProviderRuntime {
  return QA_CRABLINE_PROVIDER_RUNTIMES[channel];
}

export type {
  QaCrablineChannelDriverSelection,
  QaCrablineProviderChannel,
  QaCrablineProviderRuntimeSetup,
  QaStartedOpenClawCrablineAdapter,
} from "./types.js";
