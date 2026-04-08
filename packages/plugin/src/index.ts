import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const execFileAsync = promisify(execFile);

// Allowed CLI binaries for security
const ALLOWED_CLI_NAMES = ["draw-things-cli", "draw-things"];
const MAX_CLI_PATH_LENGTH = 1024;

// Validate CLI path for security
function validateCliPath(cliPath: string): { valid: boolean; error?: string } {
  // Check path length
  if (cliPath.length > MAX_CLI_PATH_LENGTH) {
    return { valid: false, error: "CLI path exceeds maximum length" };
  }

  // Check for path traversal attempts
  if (cliPath.includes("..") || cliPath.includes("~")) {
    return { valid: false, error: "CLI path contains invalid characters" };
  }

  // Check if binary name is in allowlist (for simple names like "draw-things-cli")
  const binaryName = cliPath.split("/").pop() || "";
  if (!ALLOWED_CLI_NAMES.includes(binaryName) && !cliPath.startsWith("/")) {
    return { valid: false, error: `Binary name "${binaryName}" not in allowed list` };
  }

  return { valid: true };
}

// Validate output directory to prevent path traversal
function validateOutputDir(outputDir: string): { valid: boolean; error?: string; resolvedPath: string } {
  // Check for path traversal
  if (outputDir.includes("..")) {
    return { valid: false, error: "Output directory contains invalid characters", resolvedPath: "" };
  }

  // Resolve ~ to home directory
  const resolvedPath = outputDir.replace(/^~\//, homedir() + "/");
  
  // Ensure it's within home directory or /tmp
  if (!resolvedPath.startsWith(homedir()) && !resolvedPath.startsWith("/tmp/")) {
    return { valid: false, error: "Output directory must be within home directory or /tmp", resolvedPath: "" };
  }

  return { valid: true, resolvedPath };
}

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

interface DrawThingsConfig {
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
  id: "draw-things",
  name: "Draw Things Image Generation",
  description: "Local AI image generation using Draw Things CLI on Apple Silicon",

  register(api) {
    const config = api.config as DrawThingsConfig;
    
    // Validate CLI path for security
    const cliPathRaw = config.cliPath ?? "draw-things-cli";
    const cliValidation = validateCliPath(cliPathRaw);
    if (!cliValidation.valid) {
      throw new Error(`Security error: ${cliValidation.error}`);
    }
    const cliPath = cliPathRaw;
    
    // Validate output directory for security
    const outputDirRaw = config.outputDir
      ? config.outputDir.replace(/^~\//, homedir() + "/")
      : join(homedir(), "Downloads", "draw-things-output");
    const outputValidation = validateOutputDir(outputDirRaw);
    if (!outputValidation.valid) {
      throw new Error(`Security error: ${outputValidation.error}`);
    }
    const outputDir = outputValidation.resolvedPath;

    // Register as an image generation provider (integrates with image_generate tool)
    // @ts-ignore - OpenClaw SDK types differ from runtime
    api.registerImageGenerationProvider({
      id: "draw-things",
      label: "Draw Things",

      // @ts-ignore
      async generate(req) {
        const {
          prompt,
          negativePrompt,
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

        // Add negative prompt if provided
        if (negativePrompt) {
          baseArgs.push("--negative-prompt", negativePrompt);
        }

        // Add models directory if configured
        if (config.modelsDir) {
          baseArgs.push("--models-dir", config.modelsDir);
        }

        // Ensure output directory exists
        await mkdir(outputDir, { recursive: true });

        // Generate images
        const results: string[] = [];

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

            results.push(outputFile);
          } catch (error) {
            const execError = error as Error & { stderr?: string };
            throw new Error(
              `Draw Things generation failed: ${execError.message}. stderr: ${execError.stderr ?? "none"}`
            );
          }
        }

        return {
          images: results.map((path) => ({ path })),
          applied: {
            width,
            height,
            steps: config.defaultSteps ?? 20,
            cfg: config.defaultCfg ?? 7.0,
            model: modelToUse ?? "default",
          },
        };
      },
    });
  },
});