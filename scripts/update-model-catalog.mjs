#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const cliPath = process.env.DRAW_THINGS_CLI ?? "draw-things-cli";
const outputPath = resolve("src/model-catalog.generated.json");

const stdout = execFileSync(cliPath, ["models", "list"], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

const catalog = {
  generatedFrom: `${cliPath} models list`,
  generatedAt: new Date().toISOString(),
  models: parseDrawThingsModelsList(stdout),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${catalog.models.length} models to ${outputPath}`);

function parseDrawThingsModelsList(output) {
  const lines = output.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headerIndex = lines.findIndex((line) => /^MODEL\s+NAME\s+SOURCE\s+DOWNLOADED\s+HUGGING_FACE/.test(line));
  if (headerIndex < 0) return [];

  const header = lines[headerIndex];
  const starts = ["MODEL", "NAME", "SOURCE", "DOWNLOADED", "HUGGING_FACE"].map((column) => header.indexOf(column));
  if (starts.some((index) => index < 0)) return [];

  return lines
    .slice(headerIndex + 1)
    .filter((line) => !/^[-\s]+$/.test(line))
    .map((line) => {
      const model = line.slice(starts[0], starts[1]).trim();
      if (!model) return null;
      const name = line.slice(starts[1], starts[2]).trim();
      const source = line.slice(starts[2], starts[3]).trim();
      const huggingFaceRaw = line.slice(starts[4]).trim();
      const record = {
        model,
        name,
        source,
        baseType: inferBaseType(model, name, huggingFaceRaw),
        purpose: inferPurpose(model, name, huggingFaceRaw),
      };
      if (huggingFaceRaw && huggingFaceRaw !== "-") record.huggingFace = huggingFaceRaw;
      return record;
    })
    .filter(Boolean);
}

function inferBaseType(model, name, huggingFace) {
  const text = `${model} ${name} ${huggingFace}`.toLowerCase();
  if (text.includes("pony")) return "pony";
  if (text.includes("flux")) return "flux";
  if (text.includes("sd3.5") || text.includes("sd_3.5") || text.includes("stable diffusion 3.5")) return "sd35";
  if (text.includes("sd3") || text.includes("sd_3") || text.includes("stable diffusion 3")) return "sd3";
  if (text.includes("sdxl") || text.includes("sd_xl") || text.includes("stable diffusion xl") || /\bxl\b/.test(text)) return "sdxl";
  if (text.includes("sd2") || text.includes("sd_2") || text.includes("stable diffusion 2")) return "sd2";
  if (text.includes("sd1") || text.includes("sd_1") || text.includes("sd_1.5") || text.includes("v1-5") || text.includes("realistic_vision") || text.includes("deliberate") || text.includes("anything")) return "sd1";
  if (text.includes("qwen")) return "qwen";
  if (text.includes("wan")) return "wan";
  if (text.includes("ltx")) return "ltx";
  if (text.includes("hidream")) return "hidream";
  if (text.includes("z image") || text.includes("z_image")) return "z-image";
  return "unknown";
}

function inferPurpose(model, name, huggingFace) {
  const text = `${model} ${name} ${huggingFace}`.toLowerCase();
  if (text.includes("inpaint") || text.includes("inpainting")) return "inpainting";
  if (text.includes("upscal")) return "upscaling";
  if (text.includes("edit") || text.includes("kontext") || text.includes("i2i") || text.includes("img2img")) return "image-to-image";
  if (text.includes("i2v") || text.includes("image-to-video")) return "image-to-video";
  if (text.includes("t2v") || text.includes("text-to-video")) return "text-to-video";
  if (text.includes("ltx")) return "text-to-video";
  return "text-to-image";
}
