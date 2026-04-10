import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type {
  ImageGenerationRequest,
  OpenClawConfig,
  OpenClawPluginApi,
  ImageGenerationResult,
} from "openclaw/plugin-sdk";
import {
  roundTo64,
  parseSize,
  parseAspectRatio,
  detectModelType,
  optimizePrompt,
  getNegativePrompt,
  getDefaultSize,
  getRecommendedSteps,
  getRecommendedCfg,
} from "./core.js";

const PROVIDER_ID = "draw-things";
const PROVIDER_NAME = "Draw Things Image Generation";
const PROVIDER_DESCRIPTION = "Local AI image generation using Draw Things CLI on Apple Silicon";
const execFileAsync = promisify(execFile);

interface DrawThingsConfig extends OpenClawConfig {
  modelsDir?: string;
  defaultModel?: string;
  defaultSteps?: number;
  defaultCfg?: number;
  outputDir?: string;
  cliPath?: string;
  highResSteps?: number; // Steps for img2img upscaling
}

// Supported sizes for capabilities declaration
const SUPPORTED_SIZES = [
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "832x1216",
  "1216x832",
  "896x1152",
  "1152x896",
  "768x1344",
  "1344x768",
  "512x512",
  "512x768",
  "768x512",
];

export default definePluginEntry({
  id: PROVIDER_ID,
  name: PROVIDER_NAME,
  description: PROVIDER_DESCRIPTION,

  register(api: OpenClawPluginApi) {
    const config = api.config as DrawThingsConfig;
    const cliPath = config.cliPath ?? "draw-things-cli";
    const outputDir = config.outputDir
      ? config.outputDir.replace(/^~\//, homedir() + "/")
      : join(homedir(), "Downloads", "draw-things-output");

    api.registerProvider({
      id: PROVIDER_ID,
      label: PROVIDER_NAME,
      auth: [],
    });

    // Register as an image generation provider
    api.registerImageGenerationProvider({
      id: PROVIDER_ID,
      label: PROVIDER_NAME,

      // Provider metadata
      defaultModel: config.defaultModel ?? "realistic_vision_v5.1_f16.ckpt",
      models: [config.defaultModel ?? "realistic_vision_v5.1_f16.ckpt"].filter(Boolean),

      isConfigured: () => true,

      capabilities: {
        generate: {
          maxCount: 1,
          supportsSize: true,
          supportsAspectRatio: true,
          supportsResolution: true,
        },
        edit: {
          enabled: false,
          maxCount: 0,
          maxInputImages: 0,
          supportsSize: false,
          supportsAspectRatio: false,
          supportsResolution: false,
        },
        geometry: {
          sizes: SUPPORTED_SIZES,
        },
      },

      async generateImage(req: ImageGenerationRequest) {
        const {
          prompt,
          model,
          size,
          aspectRatio,
          count = 1,
        } = req;

        // Determine model and its type
        const modelToUse = model || config.defaultModel || "realistic_vision_v5.1_f16.ckpt";
        const modelType = detectModelType(modelToUse);

        // Get model-optimized settings
        const modelDefaultSize = getDefaultSize(modelType);
        const recommendedSteps = getRecommendedSteps(modelType);
        const recommendedCfg = getRecommendedCfg(modelType);

        // Determine dimensions based on model type
        let width = modelDefaultSize.width;
        let height = modelDefaultSize.height;

        if (size) {
          const parsed = parseSize(size);
          if (parsed) {
            width = parsed.width;
            height = parsed.height;
          }
        } else if (aspectRatio) {
          const parsed = parseAspectRatio(aspectRatio);
          if (parsed) {
            width = parsed.width;
            height = parsed.height;
          }
        }

        // For SD 1.5, cap at 512x512 and use img2img for larger sizes
        const needsUpscaling = modelType === "sd15" && (width > 512 || height > 512);
        const targetWidth = width;
        const targetHeight = height;

        if (modelType === "sd15") {
          width = 512;
          height = 512;
        }

        // Ensure dimensions are multiples of 64
        width = roundTo64(width);
        height = roundTo64(height);

        // Optimize prompt based on model type
        const optimizedPrompt = optimizePrompt(prompt, modelType);
        const negativePrompt = getNegativePrompt(modelType);

        // Build CLI arguments
        const baseArgs: string[] = [
          "generate",
          "--prompt", optimizedPrompt,
          "--negative-prompt", negativePrompt,
          "--width", String(width),
          "--height", String(height),
          "--steps", String(config.defaultSteps ?? recommendedSteps),
          "--cfg", String(config.defaultCfg ?? recommendedCfg),
        ];

        // Add model
        baseArgs.push("--model", modelToUse);

        // Add models directory if configured
        if (config.modelsDir) {
          baseArgs.push("--models-dir", config.modelsDir);
        }

        // Ensure output directory exists
        await mkdir(outputDir, { recursive: true });

        // Generate images
        const results: Array<{ buffer: Buffer; mimeType: string; fileName: string }> = [];

        for (let i = 0; i < count; i++) {
          const timestamp = Date.now();
          const outputFile = join(outputDir, `generated-${timestamp}-${i}.png`);
          const runArgs = [...baseArgs, "--output", outputFile];

          // Vary seed for multiple images
          if (count > 1) {
            runArgs.push("--seed", String(Math.floor(Math.random() * 2147483647)));
          }

          try {
            const { stderr } = await execFileAsync(cliPath, runArgs, {
              timeout: 300000,
              maxBuffer: 10 * 1024 * 1024,
            });

            if (stderr?.trim()) {
              console.warn(`[draw-things] stderr: ${stderr}`);
            }

            if (!existsSync(outputFile)) {
              throw new Error(`Image not created at ${outputFile}`);
            }

            // Handle upscaling for SD 1.5 if needed
            if (needsUpscaling && modelType === "sd15") {
              const upscaledFile = join(outputDir, `upscaled-${timestamp}-${i}.png`);
              await upscaleImage(
                cliPath,
                outputFile,
                upscaledFile,
                targetWidth,
                targetHeight,
                modelToUse,
                config.modelsDir,
                config.highResSteps ?? 15
              );

              // Replace with upscaled version
              const buffer = await readFile(upscaledFile);
              results.push({
                buffer,
                mimeType: "image/png",
                fileName: `${timestamp}-${i}.png`,
              });
            } else {
              // Read the generated image as buffer
              const buffer = await readFile(outputFile);
              results.push({
                buffer,
                mimeType: "image/png",
                fileName: `${timestamp}-${i}.png`,
              });
            }
          } catch (error) {
            const execError = error as Error & { stderr?: string };
            throw new Error(
              `Draw Things generation failed: ${execError.message}. stderr: ${execError.stderr ?? "none"}`
            );
          }
        }

        return {
          images: results.map((img) => ({
            buffer: img.buffer,
            mimeType: img.mimeType,
            fileName: img.fileName,
          })),
          model: modelToUse,
          metadata: {
            width: needsUpscaling ? targetWidth : width,
            height: needsUpscaling ? targetHeight : height,
            steps: config.defaultSteps ?? recommendedSteps,
            cfg: config.defaultCfg ?? recommendedCfg,
            optimized: modelType !== "unknown",
          },
        };
      },
    });

    // Helper function for img2img upscaling
    async function upscaleImage(
      cli: string,
      inputPath: string,
      outputPath: string,
      targetWidth: number,
      targetHeight: number,
      model: string,
      modelsDir: string | undefined,
      steps: number
    ): Promise<void> {
      const upscaleArgs: string[] = [
        "generate",
        "--image", inputPath,
        "--prompt", "masterpiece, best quality, highly detailed",
        "--negative-prompt", "worst quality, low quality, blurry",
        "--width", String(roundTo64(targetWidth)),
        "--height", String(roundTo64(targetHeight)),
        "--steps", String(steps),
        "--cfg", "5.0",
        "--denoise", "0.4",
        "--model", model,
        "--output", outputPath,
      ];

      if (modelsDir) {
        upscaleArgs.push("--models-dir", modelsDir);
      }

      const { stderr } = await execFileAsync(cli, upscaleArgs, {
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024,
      });

      if (stderr?.trim()) {
        console.warn(`[draw-things upscaling] stderr: ${stderr}`);
      }

      if (!existsSync(outputPath)) {
        throw new Error(`Upscaled image not created at ${outputPath}`);
      }
    }
  },
});
