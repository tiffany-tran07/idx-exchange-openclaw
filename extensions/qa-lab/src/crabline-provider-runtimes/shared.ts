// Qa Lab plugin module implements shared Crabline provider runtime helpers.
import type { QaCrablineProviderRuntimeSetup, QaStartedOpenClawCrablineAdapter } from "./types.js";

export function createDefaultCrablineProviderRuntimeSetup(
  adapter: QaStartedOpenClawCrablineAdapter,
): QaCrablineProviderRuntimeSetup {
  return {
    augmentGatewayConfig: (config) => config,
    createRuntimeEnvPatch: () => adapter.createChannelDriverSmokeEnv({}),
  };
}

export function appendNodeOption(raw: string | undefined, option: string) {
  const parts = (raw ?? "").split(/\s+/u).filter(Boolean);
  return parts.includes(option) ? parts.join(" ") : [...parts, option].join(" ");
}
