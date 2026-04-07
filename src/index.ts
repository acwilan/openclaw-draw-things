import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { ASPECT_RATIOS, parseSize, roundTo64 } from "./core.js";

const execFileAsync = promisify(execFile);

interface DrawThingsConfig {
  cliPath?: string;
  outputDir?: string;
  modelsDir?: string;
  defaultModel?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultSteps?: number;
  defaultCfg?: number;
}

// Tool result must match AgentToolResult type
interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  details: Record<string, unknown>;
}

export default definePluginEntry({
  id: "draw-things",
  name: "Draw Things Image Generation",
  description: "Local AI image generation using Draw Things CLI on Apple Silicon",

  register(api) {
    const config = (api.config || {}) as DrawThingsConfig;
    const cliPath = config.cliPath ?? "draw-things-cli";
    const outputDir = config.outputDir
      ? config.outputDir.replace(/^~\//, homedir() + "/")
      : join(homedir(), "Downloads", "draw-things-output");
    const modelsDir = config.modelsDir ? config.modelsDir.replace(/^~\//, homedir() + "/") : undefined;
    const defaultModel = config.defaultModel;
    const defaultWidth = config.defaultWidth ?? 1024;
    const defaultHeight = config.defaultHeight ?? 1024;
    const defaultSteps = config.defaultSteps ?? 20;
    const defaultCfg = config.defaultCfg ?? 7.0;

    api.registerTool({
      name: "draw_things_generate",
      label: "Draw Things Generate",
      description: "Generate AI images locally using Draw Things CLI on Apple Silicon Macs. Supports SD, FLUX, and other models without API costs.",
      parameters: Type.Object({
        prompt: Type.String({ description: "Text description of the image to generate" }),
        model: Type.Optional(Type.String({ description: "Model file or name" })),
        width: Type.Optional(Type.Number({ description: "Output width in pixels" })),
        height: Type.Optional(Type.Number({ description: "Output height in pixels" })),
        aspectRatio: Type.Optional(Type.String({ description: "Aspect ratio: 1:1, 16:9, etc." })),
        size: Type.Optional(Type.String({ description: "Size as WIDTHxHEIGHT" })),
        steps: Type.Optional(Type.Number({ description: "Sampling steps" })),
        cfg: Type.Optional(Type.Number({ description: "CFG scale" })),
        negativePrompt: Type.Optional(Type.String({ description: "Negative prompt" })),
        count: Type.Optional(Type.Number({ default: 1 })),
        seed: Type.Optional(Type.Number()),
      }),

      async execute(_id, params): Promise<ToolResult> {
        const {
          prompt,
          model,
          width: paramWidth,
          height: paramHeight,
          aspectRatio,
          size,
          steps: paramSteps,
          cfg: paramCfg,
          negativePrompt,
          count: paramCount,
          seed: paramSeed,
        } = params;

        if (!prompt) {
          return {
            content: [{ type: "text", text: "Error: Prompt is required" }],
            isError: true,
            details: { error: "missing_prompt" }
          };
        }

        let width = paramWidth ?? defaultWidth;
        let height = paramHeight ?? defaultHeight;

        if (size) {
          const parsed = parseSize(size);
          if (parsed) {
            width = parsed.width;
            height = parsed.height;
          }
        } else if (aspectRatio && ASPECT_RATIOS[aspectRatio]) {
          ({ width, height } = ASPECT_RATIOS[aspectRatio]);
        }

        width = roundTo64(width);
        height = roundTo64(height);

        const steps = paramSteps ?? defaultSteps;
        const cfg = paramCfg ?? defaultCfg;
        const count = Math.min(Math.max(paramCount ?? 1, 1), 4);
        const modelToUse = model || defaultModel;

        const baseArgs = [
          "generate",
          "--prompt", prompt,
          "--width", String(width),
          "--height", String(height),
          "--steps", String(steps),
          "--cfg", String(cfg),
        ];

        if (modelToUse) baseArgs.push("--model", modelToUse);
        if (negativePrompt) baseArgs.push("--negative-prompt", negativePrompt);
        if (modelsDir) baseArgs.push("--models-dir", modelsDir);

        try {
          await mkdir(outputDir, { recursive: true });

          try {
            await execFileAsync(cliPath, ["--version"], { timeout: 5000 });
          } catch {
            return {
              content: [{
                type: "text",
                text: `Error: Draw Things CLI not found at "${cliPath}". Install from https://releases.drawthings.ai/`
              }],
              isError: true,
              details: { error: "cli_not_found", cliPath }
            };
          }

          const results: string[] = [];

          for (let i = 0; i < count; i++) {
            const timestamp = Date.now();
            const outputFile = join(outputDir, `generated-${timestamp}-${i}.png`);
            const runArgs = [...baseArgs, "--output", outputFile];

            const seed = paramSeed ?? (count > 1 ? Math.floor(Math.random() * 2147483647) : undefined);
            if (seed !== undefined) runArgs.push("--seed", String(seed));

            const { stderr } = await execFileAsync(cliPath, runArgs, {
              timeout: 300000,
              maxBuffer: 10 * 1024 * 1024,
            });

            if (stderr?.trim()) console.warn(`[draw-things] stderr: ${stderr}`);

            if (!existsSync(outputFile)) {
              return {
                content: [{ type: "text", text: `Error: Image not created at ${outputFile}` }],
                isError: true,
                details: { error: "file_not_created", outputFile }
              };
            }

            results.push(outputFile);
          }

          const resultText = results.length === 1
            ? `Generated image: ${results[0]}`
            : `Generated ${results.length} images:\n${results.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;

          return {
            content: [{ type: "text", text: resultText }],
            details: {
              width,
              height,
              steps,
              cfg,
              model: modelToUse ?? "default",
              count: results.length,
              files: results
            }
          };
        } catch (error) {
          const execError = error as Error & { stderr?: string };
          return {
            content: [{
              type: "text",
              text: `Error: ${execError.message}${execError.stderr ? `\nstderr: ${execError.stderr}` : ""}`
            }],
            isError: true,
            details: { error: "execution_failed", message: execError.message }
          };
        }
      },
    });
  },
});
