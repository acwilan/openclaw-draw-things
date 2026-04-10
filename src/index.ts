import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ImageGenerationRequest, OpenClawConfig, OpenClawPluginApi, ImageGenerationResult, GeneratedImageAsset } from "openclaw/plugin-sdk";

const PROVIDER_ID = "acwilan-draw-things";
const PROVIDER_NAME = "Draw Things Image Generation";
const PROVIDER_DESCRIPTION = "Local AI image generation using Draw Things CLI on Apple Silicon";
const execFileAsync = promisify(execFile);

// Aspect ratio to dimensions mapping (common SD/FLUX sizes)
const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "2:3": { width: 832, height: 1216 },
  "3:2": { width: 1216, height: 832 },
  "3:4": { width: 896, height: 1152 },
  "4:3": { width: 1152, height: 896 },
  "4:5": { width: 896, height: 1120 },
  "5:4": { width: 1120, height: 896 },
  "9:16": { width: 768, height: 1344 },
  "16:9": { width: 1344, height: 768 },
  "21:9": { width: 1536, height: 640 },
};

// Parse size string like "1024x1024"
function parseSize(size: string): { width: number; height: number } | null {
  const match = size.match(/^(\d+)x(\d+)$/);
  if (match) {
    return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
  }
  return null;
}

// Round to nearest multiple of 64 (required by Draw Things)
function roundTo64(n: number): number {
  return Math.round(n / 64) * 64;
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
];

interface DrawThingsConfig extends OpenClawConfig {
  modelsDir?: string;
  defaultModel?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultSteps?: number;
  defaultCfg?: number;
  outputDir?: string;
  cliPath?: string;
}

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

        // Determine dimensions
        let width = config.defaultWidth ?? 1024;
        let height = config.defaultHeight ?? 1024;

        if (size) {
          const parsed = parseSize(size);
          if (parsed) {
            width = parsed.width;
            height = parsed.height;
          }
        } else if (aspectRatio && ASPECT_RATIOS[aspectRatio]) {
          ({ width, height } = ASPECT_RATIOS[aspectRatio]);
        }

        // Ensure dimensions are multiples of 64
        width = roundTo64(width);
        height = roundTo64(height);

        // Build CLI arguments
        const baseArgs: string[] = [
          "generate",
          "--prompt", prompt,
          "--width", String(width),
          "--height", String(height),
          "--steps", String(config.defaultSteps ?? 20),
          "--cfg", String(config.defaultCfg ?? 7.0),
        ];

        // Add model
        const modelToUse = model || config.defaultModel;
        if (modelToUse) {
          baseArgs.push("--model", modelToUse);
        }

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

            // Read the generated image as buffer
            const buffer = await readFile(outputFile);
            results.push({
              buffer,
              mimeType: "image/png",
              fileName: `${timestamp}-${i}.png`,
            });
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
          model: modelToUse ?? "default",
          metadata: {
            width,
            height,
            steps: config.defaultSteps ?? 20,
            cfg: config.defaultCfg ?? 7.0,
          },
        };
      },
    });
  },
});