import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import {
  PROVIDER_DESCRIPTION,
  PROVIDER_ID,
  PROVIDER_NAME,
  type DrawThingsConfig,
} from "./config.js";
import { registerImageGenerationProvider } from "./image-generation.js";

export default definePluginEntry({
  id: PROVIDER_ID,
  name: PROVIDER_NAME,
  description: PROVIDER_DESCRIPTION,

  register(api: OpenClawPluginApi) {
    const config = api.config as DrawThingsConfig;

    api.registerProvider({
      id: PROVIDER_ID,
      label: PROVIDER_NAME,
      auth: [],
    });

    registerImageGenerationProvider(api, config);
  },
});
