import type { OpenClawConfig } from "openclaw/plugin-sdk";
import type { PromptMode } from "./model-metadata.js";

export const PROVIDER_ID = "draw-things";
export const PROVIDER_NAME = "Draw Things Image Generation";
export const PROVIDER_DESCRIPTION = "Local AI image generation using Draw Things CLI on Apple Silicon";
export const DEFAULT_TIMEOUT_MS = 300_000;

export interface DrawThingsConfig extends OpenClawConfig {
  modelsDir?: string;
  defaultModel?: string;
  defaultSize?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultSteps?: number;
  defaultCfg?: number;
  defaultEditStrength?: number;
  defaultPromptMode?: PromptMode;
  enablePromptOptimization?: boolean;
  outputDir?: string;
  cliPath?: string;
  highResSteps?: number;
  timeoutMs?: number;
}
