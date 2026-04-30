import type { ImageGenerationResolution } from "openclaw/plugin-sdk";
import { roundTo64 } from "./core.js";
import generatedCatalog from "./model-catalog.generated.json" with { type: "json" };

export type DrawThingsModelType = "sd1" | "sd2" | "sdxl" | "sd3" | "sd35" | "pony" | "flux" | "qwen" | "wan" | "ltx" | "hidream" | "z-image" | "unknown";
export type DrawThingsModelPurpose = "text-to-image" | "image-to-image" | "inpainting" | "upscaling" | "text-to-video" | "image-to-video";
export type PromptMode = "auto" | "natural" | "tagged";

export type DrawThingsModelMetadata = {
  id: string;
  label: string;
  type: DrawThingsModelType;
  defaultSize: { width: number; height: number };
  defaultSteps: number;
  defaultCfg: number;
  promptMode: PromptMode;
  supportsHighResolution: boolean;
  source?: string;
  purpose?: DrawThingsModelPurpose;
  huggingFace?: string;
};

export type DrawThingsCatalogModel = {
  model: string;
  name: string;
  source: string;
  baseType: DrawThingsModelType;
  purpose: DrawThingsModelPurpose;
  huggingFace?: string;
};

export const DRAW_THINGS_SUPPORTED_SIZES = [
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
] as const;

export const DRAW_THINGS_ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
] as const;

export const DRAW_THINGS_RESOLUTIONS: ImageGenerationResolution[] = ["1K"];

export const DEFAULT_DRAW_THINGS_MODEL = "realistic_vision_v5.1_f16.ckpt";

export const DRAW_THINGS_CLI_MODEL_CATALOG = generatedCatalog.models as DrawThingsCatalogModel[];

export const CURATED_DRAW_THINGS_MODELS: DrawThingsModelMetadata[] = [
  {
    id: "realistic_vision_v5.1_f16.ckpt",
    label: "Realistic Vision v5.1",
    type: "sd1",
    defaultSize: { width: 512, height: 512 },
    defaultSteps: 25,
    defaultCfg: 7,
    promptMode: "tagged",
    supportsHighResolution: false,
  },
  {
    id: "flux_2_klein_4b_q6p.ckpt",
    label: "FLUX.2 Klein 4B Q6P",
    type: "flux",
    defaultSize: { width: 1024, height: 1024 },
    defaultSteps: 4,
    defaultCfg: 3,
    promptMode: "natural",
    supportsHighResolution: true,
  },
  {
    id: "flux_1_schnell_4b_q8p.ckpt",
    label: "FLUX.1 Schnell 4B Q8P",
    type: "flux",
    defaultSize: { width: 1024, height: 1024 },
    defaultSteps: 4,
    defaultCfg: 3,
    promptMode: "natural",
    supportsHighResolution: true,
  },
  {
    id: "sd_xl_base_1.0_f16.ckpt",
    label: "Stable Diffusion XL Base 1.0",
    type: "sdxl",
    defaultSize: { width: 1024, height: 1024 },
    defaultSteps: 20,
    defaultCfg: 7,
    promptMode: "natural",
    supportsHighResolution: true,
  },
];

export const DRAW_THINGS_MODELS = mergeCatalogModels(CURATED_DRAW_THINGS_MODELS, DRAW_THINGS_CLI_MODEL_CATALOG);

export function getKnownModelIds(extraModel?: string): string[] {
  const ids = DRAW_THINGS_MODELS.map((model) => model.id);
  if (extraModel && !ids.includes(extraModel)) {
    ids.unshift(extraModel);
  }
  return ids;
}

export function getModelMetadata(modelName: string): DrawThingsModelMetadata {
  return DRAW_THINGS_MODELS.find((model) => model.id === modelName) ?? inferModelMetadata(modelName);
}

export function sizeForAspectRatio(aspectRatio: string, baseSize = 1024): { width: number; height: number } | null {
  const match = aspectRatio.match(/^(\d+):(\d+)$/);
  if (!match) return null;

  const w = Number.parseInt(match[1], 10);
  const h = Number.parseInt(match[2], 10);
  if (!w || !h) return null;

  const ratio = w / h;
  if (ratio >= 1) {
    return { width: roundTo64(baseSize * ratio), height: baseSize };
  }
  return { width: baseSize, height: roundTo64(baseSize / ratio) };
}

function mergeCatalogModels(
  curatedModels: DrawThingsModelMetadata[],
  catalogModels: DrawThingsCatalogModel[]
): DrawThingsModelMetadata[] {
  const byId = new Map<string, DrawThingsModelMetadata>();
  for (const catalogModel of catalogModels) {
    byId.set(catalogModel.model, modelFromCatalog(catalogModel));
  }
  for (const curatedModel of curatedModels) {
    const catalogModel = byId.get(curatedModel.id);
    byId.set(curatedModel.id, { ...catalogModel, ...curatedModel });
  }
  return [...byId.values()];
}

function modelFromCatalog(catalogModel: DrawThingsCatalogModel): DrawThingsModelMetadata {
  return metadataForBaseType(catalogModel.model, catalogModel.baseType, {
    label: catalogModel.name,
    source: catalogModel.source,
    purpose: catalogModel.purpose,
    huggingFace: catalogModel.huggingFace,
  });
}

function inferModelMetadata(id: string, extra: Partial<DrawThingsModelMetadata> = {}): DrawThingsModelMetadata {
  const lower = id.toLowerCase();
  if (lower.includes("pony")) return metadataForBaseType(id, "pony", extra);
  if (lower.includes("flux")) return metadataForBaseType(id, "flux", extra);
  if (lower.includes("sd3.5") || lower.includes("sd_3.5")) return metadataForBaseType(id, "sd35", extra);
  if (lower.includes("sd3") || lower.includes("sd_3")) return metadataForBaseType(id, "sd3", extra);
  if (lower.includes("xl") || lower.includes("sd_xl")) return metadataForBaseType(id, "sdxl", extra);
  if (lower.includes("sd_2") || lower.includes("sd2")) return metadataForBaseType(id, "sd2", extra);
  if (
    lower.includes("sd_1.5") ||
    lower.includes("sd1.5") ||
    lower.includes("v1-5") ||
    lower.includes("realistic_vision") ||
    lower.includes("deliberate") ||
    lower.includes("anything")
  ) return metadataForBaseType(id, "sd1", extra);
  if (lower.includes("qwen")) return metadataForBaseType(id, "qwen", extra);
  if (lower.includes("wan")) return metadataForBaseType(id, "wan", extra);
  if (lower.includes("ltx")) return metadataForBaseType(id, "ltx", extra);
  if (lower.includes("hidream")) return metadataForBaseType(id, "hidream", extra);
  if (lower.includes("z_image") || lower.includes("z image")) return metadataForBaseType(id, "z-image", extra);

  return metadataForBaseType(id, "unknown", extra);
}

function metadataForBaseType(
  id: string,
  baseType: DrawThingsModelType,
  extra: Partial<DrawThingsModelMetadata> = {}
): DrawThingsModelMetadata {
  switch (baseType) {
    case "sd1":
    case "sd2":
      return unknownModel(id, baseType, "tagged", 25, 7, { width: 512, height: 512 }, false, extra);
    case "flux":
      return unknownModel(id, baseType, "natural", 4, 3, { width: 1024, height: 1024 }, true, extra);
    case "pony":
      return unknownModel(id, baseType, "auto", 20, 7, { width: 1024, height: 1024 }, true, extra);
    case "sdxl":
    case "sd3":
    case "sd35":
    case "qwen":
    case "hidream":
    case "z-image":
      return unknownModel(id, baseType, "natural", 20, 7, { width: 1024, height: 1024 }, true, extra);
    case "wan":
    case "ltx":
      return unknownModel(id, baseType, "natural", 20, 7, { width: 1024, height: 576 }, true, extra);
    default:
      return unknownModel(id, "unknown", "natural", 20, 7, { width: 1024, height: 1024 }, true, extra);
  }
}

function unknownModel(
  id: string,
  type: DrawThingsModelType,
  promptMode: PromptMode,
  defaultSteps: number,
  defaultCfg: number,
  defaultSize: { width: number; height: number },
  supportsHighResolution: boolean,
  extra: Partial<DrawThingsModelMetadata> = {}
): DrawThingsModelMetadata {
  return {
    id,
    label: id,
    type,
    defaultSize,
    defaultSteps,
    defaultCfg,
    promptMode,
    supportsHighResolution,
    ...extra,
  };
}
