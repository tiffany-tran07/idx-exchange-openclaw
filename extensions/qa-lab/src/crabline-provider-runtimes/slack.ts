// Qa Lab plugin module implements Slack-specific Crabline provider runtime setup.
import type { QaCrablineProviderRuntime } from "./types.js";

export const SLACK_QA_CRABLINE_PROVIDER_RUNTIME: QaCrablineProviderRuntime = {
  channel: "slack",
  async setup({ adapter }) {
    return {
      augmentGatewayConfig(config) {
        const env = adapter.createChannelDriverSmokeEnv({});
        const apiUrl = env.SLACK_API_URL?.trim();
        if (!apiUrl) {
          return config;
        }
        const channels = config.channels ?? {};
        const slack = channels.slack ?? {};
        return {
          ...config,
          channels: {
            ...channels,
            slack: {
              ...slack,
              apiUrl,
            },
          },
        };
      },
      createRuntimeEnvPatch() {
        const { SLACK_API_URL: _apiUrl, ...rest } = adapter.createChannelDriverSmokeEnv({});
        return rest;
      },
    };
  },
};
