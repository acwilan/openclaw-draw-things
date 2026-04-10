// Core utility functions for Draw Things with model-aware optimizations

export const DEFAULT_SIZE = { width: 1024, height: 1024 };
export const SD15_SIZE = { width: 512, height: 512 };

// Round to nearest multiple of 64 (required by Draw Things)
export function roundTo64(n: number): number {
  return Math.round(n / 64) * 64;
}

// Parse size string like "1024x1024"
export function parseSize(size: string): { width: number; height: number } | null {
  const match = size.match(/^(\d+)x(\d+)$/);
  if (match) {
    return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
  }
  return null;
}

// Parse aspect ratio to dimensions
export function parseAspectRatio(aspectRatio: string): { width: number; height: number } | null {
  const match = aspectRatio.match(/^(\d+):(\d+)$/);
  if (!match) return null;
  
  const w = parseInt(match[1], 10);
  const h = parseInt(match[2], 10);
  
  // Base size for calculations
  const baseSize = 1024;
  const ratio = w / h;
  
  let width: number;
  let height: number;
  
  if (ratio >= 1) {
    height = baseSize;
    width = roundTo64(baseSize * ratio);
  } else {
    width = baseSize;
    height = roundTo64(baseSize / ratio);
  }
  
  return { width, height };
}

// Model type detection
export type ModelType = "sd15" | "sdxl" | "pony" | "flux" | "unknown";

export function detectModelType(modelName: string): ModelType {
  const lower = modelName.toLowerCase();
  
  // SD 1.5 / 2.x detection
  if (lower.includes("sd_1.5") || lower.includes("sd1.5") || 
      lower.includes("sd_2") || lower.includes("sd2") ||
      lower.includes("v1-5") || lower.includes("realistic_vision") ||
      lower.includes("deliberate") || lower.includes("anything")) {
    return "sd15";
  }
  
  // Pony detection
  if (lower.includes("pony")) {
    return "pony";
  }
  
  // SDXL detection
  if (lower.includes("xl") || lower.includes("sd_xl")) {
    return "sdxl";
  }
  
  // FLUX detection
  if (lower.includes("flux")) {
    return "flux";
  }
  
  return "unknown";
}

// Convert prompt to Danbooru style (comma-separated tags) for SD 1.5/2.x models
export function convertToDanbooruStyle(prompt: string): string {
  // Remove extra whitespace and normalize
  let normalized = prompt.trim().toLowerCase();
  
  // Replace common descriptors with tags
  const tagMappings: Record<string, string> = {
    "a woman": "1girl",
    "a man": "1boy", 
    "a girl": "1girl",
    "a boy": "1boy",
    "person": "1person",
    "people": "multiple_persons",
    "smiling": "smile",
    "laughing": "laugh",
    "wearing a": "wearing",
    "holding a": "holding",
    "standing": "standing",
    "sitting": "sitting",
    "walking": "walking",
    "looking at": "looking_at_viewer",
    "portrait": "portrait",
    "full body": "full_body",
    "upper body": "upper_body",
    "close up": "close-up",
  };
  
  for (const [phrase, tag] of Object.entries(tagMappings)) {
    normalized = normalized.replace(new RegExp(`\\b${phrase}\\b`, "gi"), tag);
  }
  
  // Split by common separators and clean up
  const parts = normalized
    .split(/[,;]|\s+and\s+|\s+with\s+/gi)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Remove duplicates and join with commas
  const uniqueTags = [...new Set(parts)];
  return uniqueTags.join(", ");
}

// Add Pony score tags
export function addPonyTags(prompt: string): string {
  const baseTags = ["score_9", "score_8_up", "score_7_up", "score_6_up", "score_5_up", "score_4_up"];
  const qualityTags = ["source_furry", "source_pony", "source_cartoon"];
  
  // Check if already has score tags
  if (prompt.includes("score_")) {
    return prompt;
  }
  
  const scores = baseTags.slice(0, 3).join(", ");
  const quality = qualityTags[Math.floor(Math.random() * qualityTags.length)];
  
  return `${scores}, ${quality}, ${prompt}`;
}

// Optimize prompt based on model type
export function optimizePrompt(prompt: string, modelType: ModelType): string {
  switch (modelType) {
    case "sd15":
      return convertToDanbooruStyle(prompt);
    case "pony":
      return addPonyTags(prompt);
    case "sdxl":
    case "flux":
    default:
      // Keep natural language for SDXL and FLUX
      return prompt;
  }
}

// Get negative prompt based on model type
export function getNegativePrompt(modelType: ModelType): string {
  const commonNegatives = [
    "worst quality",
    "low quality",
    "normal quality",
    "lowres",
    "bad anatomy",
    "bad hands",
    "text",
    "error",
    "missing fingers",
    "extra digit",
    "fewer digits",
    "cropped",
    "jpeg artifacts",
    "signature",
    "watermark",
    "username",
    "artist name",
  ];
  
  const ponyNegatives = [
    "source_pony",
    "source_furry",
  ];
  
  const baseNegatives = commonNegatives.join(", ");
  
  if (modelType === "pony") {
    return `${baseNegatives}, ${ponyNegatives.join(", ")}`;
  }
  
  return baseNegatives;
}

// Get default size based on model type
export function getDefaultSize(modelType: ModelType): { width: number; height: number } {
  switch (modelType) {
    case "sd15":
      return SD15_SIZE;
    case "sdxl":
    case "pony":
    case "flux":
    default:
      return DEFAULT_SIZE;
  }
}

// Check if model supports high resolution
export function supportsHighRes(modelType: ModelType): boolean {
  return modelType === "sdxl" || modelType === "pony" || modelType === "flux";
}

// Calculate steps based on model type
export function getRecommendedSteps(modelType: ModelType): number {
  switch (modelType) {
    case "sd15":
      return 25; // SD 1.5 works well with fewer steps
    case "flux":
      return 4; // FLUX is fast
    case "sdxl":
    case "pony":
    default:
      return 20; // Default for others
  }
}

// Calculate CFG scale based on model type  
export function getRecommendedCfg(modelType: ModelType): number {
  switch (modelType) {
    case "sd15":
      return 7; // Standard for SD 1.5
    case "flux":
      return 3; // FLUX uses lower CFG
    case "sdxl":
    case "pony":
    default:
      return 7;
  }
}
