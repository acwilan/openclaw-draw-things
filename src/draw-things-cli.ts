import { execFile, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { DEFAULT_TIMEOUT_MS, type DrawThingsConfig } from "./config.js";
import { DEFAULT_DRAW_THINGS_MODEL } from "./model-metadata.js";

const execFileAsync = promisify(execFile);

export type DrawThingsCliModel = {
  model: string;
  name: string;
  source: string;
  downloaded: boolean;
  huggingFace?: string;
};

export async function runDrawThings(cliPath: string, args: string[], timeout: number, operation: string): Promise<void> {
  try {
    const { stderr } = await execFileAsync(cliPath, args, {
      timeout,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr?.trim()) {
      console.warn(`[draw-things ${operation}] stderr: ${stderr}`);
    }
  } catch (error) {
    const execError = error as Error & { stderr?: string; code?: string };
    if (execError.code === "ENOENT") {
      throw new Error(
        `Draw Things CLI not found at "${cliPath}". Install it with: brew tap drawthingsai/draw-things && brew install draw-things-cli`
      );
    }
    throw new Error(
      `Draw Things ${operation} failed: ${execError.message}. stderr: ${execError.stderr ?? "none"}`
    );
  }
}

export async function listDrawThingsModels(
  cliPath = "draw-things-cli",
  options: { downloadedOnly?: boolean; timeoutMs?: number } = {}
): Promise<DrawThingsCliModel[]> {
  const args = ["models", "list"];
  if (options.downloadedOnly) args.push("--downloaded-only");
  const { stdout } = await execFileAsync(cliPath, args, {
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxBuffer: 20 * 1024 * 1024,
  });
  return parseDrawThingsModelsList(stdout);
}

export function listDrawThingsModelsSync(
  cliPath = "draw-things-cli",
  options: { downloadedOnly?: boolean; timeoutMs?: number } = {}
): DrawThingsCliModel[] {
  const args = ["models", "list"];
  if (options.downloadedOnly) args.push("--downloaded-only");
  const stdout = execFileSync(cliPath, args, {
    timeout: options.timeoutMs ?? 10_000,
    maxBuffer: 20 * 1024 * 1024,
    encoding: "utf8",
  });
  return parseDrawThingsModelsList(stdout);
}

export function parseDrawThingsModelsList(output: string): DrawThingsCliModel[] {
  const lines = output.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headerIndex = lines.findIndex((line) => /^MODEL\s+NAME\s+SOURCE\s+DOWNLOADED\s+HUGGING_FACE/.test(line));
  if (headerIndex < 0) return [];

  const header = lines[headerIndex];
  const starts = [
    header.indexOf("MODEL"),
    header.indexOf("NAME"),
    header.indexOf("SOURCE"),
    header.indexOf("DOWNLOADED"),
    header.indexOf("HUGGING_FACE"),
  ];
  if (starts.some((index) => index < 0)) return [];

  const rows = lines.slice(headerIndex + 1).filter((line) => !/^[-\s]+$/.test(line));
  const parsed: DrawThingsCliModel[] = [];
  for (const line of rows) {
    const model = sliceColumn(line, starts[0], starts[1]);
    if (!model) continue;

    const name = sliceColumn(line, starts[1], starts[2]);
    const source = sliceColumn(line, starts[2], starts[3]);
    const downloaded = sliceColumn(line, starts[3], starts[4]).toLowerCase() === "yes";
    const huggingFaceRaw = line.slice(starts[4]).trim();
    const record: DrawThingsCliModel = { model, name, source, downloaded };
    if (huggingFaceRaw && huggingFaceRaw !== "-") {
      record.huggingFace = huggingFaceRaw;
    }
    parsed.push(record);
  }
  return parsed;
}

export async function resolveDownloadedModel(
  requestedModel: string | undefined,
  config: DrawThingsConfig
): Promise<string> {
  const candidate = requestedModel || config.defaultModel || DEFAULT_DRAW_THINGS_MODEL;
  let downloaded: DrawThingsCliModel[] = [];
  try {
    downloaded = await listDrawThingsModels(config.cliPath ?? "draw-things-cli", {
      downloadedOnly: true,
      timeoutMs: Math.min(config.timeoutMs ?? 10_000, 10_000),
    });
  } catch {
    return candidate;
  }
  return chooseDownloadedModel(candidate, downloaded.map((model) => model.model), config.defaultModel);
}

export function chooseDownloadedModel(
  requestedModel: string,
  downloadedModelIds: string[],
  configuredDefault?: string
): string {
  if (downloadedModelIds.includes(requestedModel)) return requestedModel;
  if (configuredDefault && downloadedModelIds.includes(configuredDefault)) return configuredDefault;
  if (downloadedModelIds.includes(DEFAULT_DRAW_THINGS_MODEL)) return DEFAULT_DRAW_THINGS_MODEL;
  return downloadedModelIds[0] ?? requestedModel;
}

export function isDrawThingsConfigured(config: DrawThingsConfig): boolean {
  const cliPath = config.cliPath ?? "draw-things-cli";
  const outputDir = expandHome(config.outputDir ?? "~/Downloads/draw-things-output");

  try {
    if (!cliExists(cliPath)) return false;

    const parentDir = dirname(outputDir);
    if (!existsSync(outputDir) && !existsSync(parentDir)) return false;

    const downloaded = listDrawThingsModelsSync(cliPath, { downloadedOnly: true });
    if (downloaded.length === 0) return false;

    const selected = config.defaultModel ?? DEFAULT_DRAW_THINGS_MODEL;
    if (downloaded.some((model) => model.model === selected)) return true;

    return Boolean(chooseDownloadedModel(selected, downloaded.map((model) => model.model), config.defaultModel));
  } catch {
    return false;
  }
}

export function expandHome(path: string): string {
  if (path === "~") return homedir();
  return path.replace(/^~\//, `${homedir()}/`);
}

function cliExists(cliPath: string): boolean {
  if (cliPath.includes("/")) return existsSync(expandHome(cliPath));
  return (process.env.PATH ?? "").split(":").some((dir) => existsSync(join(dir, cliPath)));
}

function sliceColumn(line: string, start: number, end: number): string {
  return line.slice(start, end).trim();
}
