import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import type { OpenClawConfig, OpenClawPluginApi } from "openclaw/plugin-sdk";
import {
  PROVIDER_DESCRIPTION,
  PROVIDER_ID,
  PROVIDER_NAME,
  type DrawThingsConfig,
} from "./config.js";
import { registerImageGenerationProvider } from "./image-generation.js";

export function resolveStartupConfig(api: OpenClawPluginApi): DrawThingsConfig {
  const globalPluginConfig = api.config?.plugins?.entries?.[PROVIDER_ID]?.config as DrawThingsConfig | undefined;
  const legacyDirectConfig = looksLikeDrawThingsConfig(api.config) ? api.config as DrawThingsConfig : undefined;

  // Some OpenClaw registration modes provide only schema defaults in pluginConfig,
  // while the user's actual config is available in the full OpenClaw config. Merge
  // both instead of picking pluginConfig with `||`, because `{}` / defaults are
  // truthy and can otherwise hide modelsDir.
  return {
    ...(legacyDirectConfig ?? {}),
    ...(api.pluginConfig as DrawThingsConfig | undefined ?? {}),
    ...(globalPluginConfig ?? {}),
  };
}

function looksLikeDrawThingsConfig(config: OpenClawConfig | undefined): config is OpenClawConfig & DrawThingsConfig {
  if (!config) return false;
  return Boolean(
    "modelsDir" in config ||
    "cliPath" in config ||
    "outputDir" in config ||
    "defaultModel" in config ||
    "defaultSize" in config
  );
}

export default definePluginEntry({
  id: PROVIDER_ID,
  name: PROVIDER_NAME,
  description: PROVIDER_DESCRIPTION,

  register(api: OpenClawPluginApi) {
    const config = resolveStartupConfig(api);
    registerImageGenerationProvider(api, config);
  },
});
