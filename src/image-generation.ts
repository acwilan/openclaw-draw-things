import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  ImageGenerationRequest,
  ImageGenerationResult,
  OpenClawPluginApi,
} from "openclaw/plugin-sdk";
import {
  floorTo64,
  getNegativePrompt,
  optimizePrompt,
  parseLoraTokens,
  parseSize,
  type ParsedLora,
} from "./core.js";
import {
  DEFAULT_TIMEOUT_MS,
  PROVIDER_ID,
  PROVIDER_NAME,
  type DrawThingsConfig,
} from "./config.js";
import {
  expandHome,
  isDrawThingsConfigured,
  resolveDownloadedModel,
  runDrawThings,
} from "./draw-things-cli.js";
import {
  DEFAULT_DRAW_THINGS_MODEL,
  DRAW_THINGS_ASPECT_RATIOS,
  DRAW_THINGS_RESOLUTIONS,
  DRAW_THINGS_SUPPORTED_SIZES,
  getKnownModelIds,
  getModelMetadata,
  sizeForAspectRatio,
  type PromptMode,
} from "./model-metadata.js";

type CliImageResult = { buffer: Buffer; mimeType: string; fileName: string };

export type GenerationSettings = {
  modelToUse: string;
  width: number;
  height: number;
  targetWidth: number;
  targetHeight: number;
  needsUpscaling: boolean;
  steps: number;
  cfg: number;
  editStrength: number;
  promptMode: PromptMode;
  optimizedPrompt: string;
  negativePrompt: string;
  modelType: string;
  /** LoRAs parsed from `<lora:...>` tokens in the original prompt. */
  loras: ParsedLora[];
};

export function registerImageGenerationProvider(api: OpenClawPluginApi, registrationConfig: DrawThingsConfig): void {
  api.registerImageGenerationProvider({
    id: PROVIDER_ID,
    label: PROVIDER_NAME,
    defaultModel: registrationConfig.defaultModel ?? DEFAULT_DRAW_THINGS_MODEL,
    models: getKnownModelIds(registrationConfig.defaultModel),

    isConfigured: (ctx) => {
      const runtimeConfig = ctx.cfg?.plugins?.entries?.[PROVIDER_ID]?.config as DrawThingsConfig | undefined;
      return isDrawThingsConfigured({ ...registrationConfig, ...runtimeConfig });
    },

    capabilities: {
      generate: {
        maxCount: 1,
        supportsSize: true,
        supportsAspectRatio: true,
        supportsResolution: true,
      },
      edit: {
        enabled: true,
        maxCount: 1,
        maxInputImages: 1,
        supportsSize: true,
        supportsAspectRatio: true,
        supportsResolution: true,
      },
      geometry: {
        sizes: [...DRAW_THINGS_SUPPORTED_SIZES],
        aspectRatios: [...DRAW_THINGS_ASPECT_RATIOS],
        resolutions: [...DRAW_THINGS_RESOLUTIONS],
      },
    },

    async generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
      const config = resolveRequestConfig(req, registrationConfig);
      const cliPath = config.cliPath ?? "draw-things-cli";
      const outputDir = expandHome(config.outputDir ?? "~/Downloads/draw-things-output");
      const count = Math.min(req.count ?? 1, 1);
      const inputImages = req.inputImages ?? [];
      const isEdit = inputImages.length > 0;

      await mkdir(outputDir, { recursive: true });

      const settings = await buildGenerationSettings(req, config);
      const inputImagePath = isEdit
        ? await writeInputImage(inputImages[0], outputDir)
        : undefined;

      const baseArgs = buildGenerateArgs(settings, config, inputImagePath);
      const results: CliImageResult[] = [];

      try {
        for (let i = 0; i < count; i++) {
          const timestamp = Date.now();
          const outputFile = join(outputDir, `generated-${timestamp}-${i}.png`);
          const runArgs = [...baseArgs, "--output", outputFile];

          if (count > 1) {
            runArgs.push("--seed", String(Math.floor(Math.random() * 2_147_483_647)));
          }

          await runDrawThings(cliPath, runArgs, config.timeoutMs ?? req.timeoutMs ?? DEFAULT_TIMEOUT_MS, "generation");
          assertFileCreated(outputFile, "Image");

          if (settings.needsUpscaling) {
            const upscaledFile = join(outputDir, `upscaled-${timestamp}-${i}.png`);
            await upscaleImage(cliPath, outputFile, upscaledFile, settings, config);
            results.push(await readImageResult(upscaledFile, timestamp, i));
          } else {
            results.push(await readImageResult(outputFile, timestamp, i));
          }
        }
      } finally {
        if (inputImagePath) {
          await unlink(inputImagePath).catch(() => undefined);
        }
      }

      return {
        images: results,
        model: settings.modelToUse,
        metadata: {
          width: settings.needsUpscaling ? settings.targetWidth : settings.width,
          height: settings.needsUpscaling ? settings.targetHeight : settings.height,
          steps: settings.steps,
          cfg: settings.cfg,
          modelType: settings.modelType,
          promptMode: settings.promptMode,
          optimized: settings.optimizedPrompt !== req.prompt,
          loras: settings.loras.length > 0 ? settings.loras : undefined,
          edit: isEdit,
          strength: isEdit ? settings.editStrength : undefined,
        },
      };
    },
  });
}

export function resolveRequestConfig(req: ImageGenerationRequest, fallback: DrawThingsConfig): DrawThingsConfig {
  const runtimeConfig = req.cfg?.plugins?.entries?.[PROVIDER_ID]?.config as DrawThingsConfig | undefined;
  return { ...fallback, ...runtimeConfig };
}

export async function buildGenerationSettings(req: ImageGenerationRequest, config: DrawThingsConfig): Promise<GenerationSettings> {
  const requestedModel = req.model || config.defaultModel || DEFAULT_DRAW_THINGS_MODEL;
  const modelToUse = await resolveDownloadedModel(requestedModel, config);
  return buildGenerationSettingsForModel(req, config, modelToUse);
}

export function buildGenerationSettingsForModel(
  req: ImageGenerationRequest,
  config: DrawThingsConfig,
  modelToUse: string
): GenerationSettings {
  const metadata = getModelMetadata(modelToUse);

  let width = config.defaultWidth ?? metadata.defaultSize.width;
  let height = config.defaultHeight ?? metadata.defaultSize.height;

  const configuredSize = config.defaultSize ? parseSize(config.defaultSize) : null;

  if (req.size) {
    const parsed = parseSize(req.size);
    if (parsed) {
      width = parsed.width;
      height = parsed.height;
    }
  } else if (configuredSize) {
    width = configuredSize.width;
    height = configuredSize.height;
  } else if (req.aspectRatio) {
    const parsed = sizeForAspectRatio(req.aspectRatio);
    if (parsed) {
      width = parsed.width;
      height = parsed.height;
    }
  } else if (req.resolution === "2K") {
    width *= 2;
    height *= 2;
  } else if (req.resolution === "4K") {
    width *= 4;
    height *= 4;
  }

  const targetWidth = floorTo64(width);
  const targetHeight = floorTo64(height);
  const needsUpscaling = (metadata.type === "sd1" || metadata.type === "sd2") && (targetWidth > 512 || targetHeight > 512);

  if (needsUpscaling) {
    width = 512;
    height = 512;
  } else {
    width = targetWidth;
    height = targetHeight;
  }

  const promptMode = config.defaultPromptMode ?? metadata.promptMode;
  const shouldOptimize = config.enablePromptOptimization ?? promptMode !== "natural";
  const prompt = appendDefaultPrompt(req.prompt, config.defaultPromptAppend);

  // Parse LoRA tokens from the raw prompt before optimization
  const { cleanPrompt, loras } = parseLoraTokens(prompt);
  const optimizedPrompt = shouldOptimize ? optimizePromptForMode(cleanPrompt, promptMode, metadata.type) : cleanPrompt;

  return {
    modelToUse,
    width,
    height,
    targetWidth,
    targetHeight,
    needsUpscaling,
    steps: config.defaultSteps ?? metadata.defaultSteps,
    cfg: config.defaultCfg ?? metadata.defaultCfg,
    editStrength: config.defaultEditStrength ?? 0.5,
    promptMode,
    optimizedPrompt,
    negativePrompt: getNegativePrompt(toCoreModelType(metadata.type)),
    modelType: metadata.type,
    loras,
  };
}

export function buildGenerateArgs(settings: GenerationSettings, config: DrawThingsConfig, inputImagePath?: string): string[] {
  const args = [
    "generate",
    "--prompt", settings.optimizedPrompt,
    "--negative-prompt", settings.negativePrompt,
    "--width", String(settings.width),
    "--height", String(settings.height),
    "--steps", String(settings.steps),
    "--cfg", String(settings.cfg),
    "--model", settings.modelToUse,
  ];

  appendConfigJsonArgs(args, config, settings.loras);

  if (inputImagePath) {
    args.push("--image", inputImagePath, "--strength", String(settings.editStrength));
  }

  if (config.modelsDir) {
    args.push("--models-dir", expandHome(config.modelsDir));
  }

  return args;
}

export function appendConfigJsonArgs(args: string[], config: DrawThingsConfig, loras?: ParsedLora[]): void {
  const merged = mergeConfigJsonWithLoras(config.defaultConfigJson, loras);
  if (merged && Object.keys(merged).length > 0) {
    args.push("--config-json", JSON.stringify(merged));
  }
}

function mergeConfigJsonWithLoras(
  base: Record<string, unknown> | undefined,
  loras: ParsedLora[] | undefined
): Record<string, unknown> | undefined {
  if (!base && (!loras || loras.length === 0)) return undefined;

  const merged = { ...(base ?? {}) };

  if (loras && loras.length > 0) {
    // Merge parsed LoRAs after any already configured in defaultConfigJson
    const existing = Array.isArray(merged.loras) ? [...merged.loras] : [];
    merged.loras = [
      ...existing,
      ...loras.map((l) => ({ mode: "all", file: l.file, weight: l.weight })),
    ];
  }

  return merged;
}

export function appendDefaultPrompt(prompt: string, defaultPromptAppend?: string): string {
  const suffix = defaultPromptAppend?.trim();
  if (!suffix) return prompt;

  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) return suffix;

  return `${trimmedPrompt}, ${suffix}`;
}

export function optimizePromptForMode(prompt: string, promptMode: PromptMode, modelType: string): string {
  if (promptMode === "natural") return prompt;
  if (promptMode === "tagged") return optimizePrompt(prompt, "sd15");
  return optimizePrompt(prompt, toCoreModelType(modelType));
}

function toCoreModelType(modelType: string): Parameters<typeof optimizePrompt>[1] {
  if (modelType === "sd1" || modelType === "sd2") return "sd15";
  if (modelType === "sdxl" || modelType === "pony" || modelType === "flux") return modelType;
  return "unknown";
}

async function writeInputImage(inputImage: NonNullable<ImageGenerationRequest["inputImages"]>[number], outputDir: string): Promise<string> {
  if (!inputImage.buffer) {
    throw new Error("Draw Things image editing requires an input image buffer.");
  }

  const inputImagePath = join(outputDir, `input-${Date.now()}.png`);
  await writeFile(inputImagePath, inputImage.buffer);
  return inputImagePath;
}

async function readImageResult(path: string, timestamp: number, index: number): Promise<CliImageResult> {
  return {
    buffer: await readFile(path),
    mimeType: "image/png",
    fileName: `draw-things-${timestamp}-${index}.png`,
  };
}

async function upscaleImage(
  cliPath: string,
  inputPath: string,
  outputPath: string,
  settings: GenerationSettings,
  config: DrawThingsConfig
): Promise<void> {
  const upscaleArgs = [
    "generate",
    "--image", inputPath,
    "--prompt", "masterpiece, best quality, highly detailed",
    "--negative-prompt", "worst quality, low quality, blurry",
    "--width", String(settings.targetWidth),
    "--height", String(settings.targetHeight),
    "--steps", String(config.highResSteps ?? 15),
    "--cfg", "5.0",
    "--strength", "0.4",
    "--model", settings.modelToUse,
    "--output", outputPath,
  ];

  appendConfigJsonArgs(upscaleArgs, config, settings.loras);

  if (config.modelsDir) {
    upscaleArgs.push("--models-dir", expandHome(config.modelsDir));
  }

  await runDrawThings(cliPath, upscaleArgs, config.timeoutMs ?? DEFAULT_TIMEOUT_MS, "upscaling");
  assertFileCreated(outputPath, "Upscaled image");
}

function assertFileCreated(path: string, label: string): void {
  if (!existsSync(path)) {
    throw new Error(`${label} not created at ${path}`);
  }
}
