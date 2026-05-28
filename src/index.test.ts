import { describe, it, expect } from "vitest";
import type { ImageGenerationRequest } from "openclaw/plugin-sdk";
import {
  DEFAULT_SIZE,
  SD15_SIZE,
  parseSize,
  floorTo64,
  roundTo64,
  parseAspectRatio,
  detectModelType,
  convertToDanbooruStyle,
  addPonyTags,
  optimizePrompt,
  getNegativePrompt,
  getDefaultSize,
  getRecommendedSteps,
  getRecommendedCfg,
  parseLoraTokens,
  type ModelType,
} from "./core.js";
import {
  DEFAULT_DRAW_THINGS_MODEL,
  DRAW_THINGS_ASPECT_RATIOS,
  DRAW_THINGS_CLI_MODEL_CATALOG,
  DRAW_THINGS_RESOLUTIONS,
  DRAW_THINGS_SUPPORTED_SIZES,
  getKnownModelIds,
  getModelMetadata,
  sizeForAspectRatio,
} from "./model-metadata.js";
import {
  chooseDownloadedModel,
  parseDrawThingsModelsList,
} from "./draw-things-cli.js";
import {
  appendDefaultPrompt,
  appendConfigJsonArgs,
  buildGenerateArgs,
  buildGenerationSettingsForModel,
  optimizePromptForMode,
  type GenerationSettings,
} from "./image-generation.js";

describe("Core utilities", () => {
  describe("parseSize", () => {
    it("should parse valid size strings", () => {
      expect(parseSize("1024x1024")).toEqual({ width: 1024, height: 1024 });
      expect(parseSize("512x768")).toEqual({ width: 512, height: 768 });
    });

    it("should return null for invalid size strings", () => {
      expect(parseSize("invalid")).toBeNull();
      expect(parseSize("1024")).toBeNull();
      expect(parseSize("")).toBeNull();
    });
  });

  describe("roundTo64", () => {
    it("should round to nearest multiple of 64", () => {
      expect(roundTo64(32)).toBe(64);
      expect(roundTo64(100)).toBe(128);
      expect(roundTo64(1024)).toBe(1024);
      expect(roundTo64(1000)).toBe(1024);
      expect(roundTo64(1025)).toBe(1024);
    });
  });

  describe("floorTo64", () => {
    it("should reduce to the nearest lower multiple of 64", () => {
      expect(floorTo64(32)).toBe(64);
      expect(floorTo64(100)).toBe(64);
      expect(floorTo64(1024)).toBe(1024);
      expect(floorTo64(1088)).toBe(1088);
      expect(floorTo64(1100)).toBe(1088);
    });
  });

  describe("parseAspectRatio", () => {
    it("should parse common aspect ratios", () => {
      const result1 = parseAspectRatio("1:1");
      expect(result1).not.toBeNull();
      expect(result1?.width).toBe(1024);
      expect(result1?.height).toBe(1024);

      const result16_9 = parseAspectRatio("16:9");
      expect(result16_9).not.toBeNull();
      expect(result16_9?.width).toBeGreaterThan(result16_9?.height || 0);

      const result9_16 = parseAspectRatio("9:16");
      expect(result9_16).not.toBeNull();
      expect(result9_16?.width).toBeLessThan(result9_16?.height || 0);
    });

    it("should return null for invalid ratios", () => {
      expect(parseAspectRatio("invalid")).toBeNull();
      expect(parseAspectRatio("16")).toBeNull();
      expect(parseAspectRatio("")).toBeNull();
    });
  });

  describe("detectModelType", () => {
    it("should detect SD 1.5 models", () => {
      expect(detectModelType("realistic_vision_v5.1")).toBe("sd15");
      expect(detectModelType("sd_1.5_model.ckpt")).toBe("sd15");
      expect(detectModelType("v1-5-pruned")).toBe("sd15");
      expect(detectModelType("deliberate_v3")).toBe("sd15");
      expect(detectModelType("anything-v5")).toBe("sd15");
    });

    it("should detect Pony models", () => {
      expect(detectModelType("pony_diffusion_v6")).toBe("pony");
      expect(detectModelType("ponyxl_v8")).toBe("pony");
    });

    it("should detect SDXL models", () => {
      expect(detectModelType("sd_xl_base_1.0")).toBe("sdxl");
      expect(detectModelType("juggernautXL_v9")).toBe("sdxl");
    });

    it("should detect FLUX models", () => {
      expect(detectModelType("flux_1_schnell")).toBe("flux");
      expect(detectModelType("flux_2_klein_4b")).toBe("flux");
    });

    it("should return unknown for unrecognized models", () => {
      expect(detectModelType("mystery_model")).toBe("unknown");
      expect(detectModelType("custom_v1")).toBe("unknown");
    });
  });

  describe("parseLoraTokens", () => {
    it("should extract a single LoRA token", () => {
      const result = parseLoraTokens("a beautiful woman <lora:realistic_vision:0.75>");
      expect(result.cleanPrompt).toBe("a beautiful woman");
      expect(result.loras).toEqual([{ file: "realistic_vision", weight: 0.75 }]);
    });

    it("should extract multiple LoRA tokens", () => {
      const result = parseLoraTokens(
        "a portrait <lora:breath_of_the_wild_style:1> with <lora:detailed_eyes:0.6>"
      );
      expect(result.cleanPrompt).toBe("a portrait with");
      expect(result.loras).toEqual([
        { file: "breath_of_the_wild_style", weight: 1 },
        { file: "detailed_eyes", weight: 0.6 },
      ]);
    });

    it("should return empty loras for malformed weight", () => {
      const result = parseLoraTokens("a woman <lora:style:abc>");
      expect(result.cleanPrompt).toBe("a woman <lora:style:abc>");
      expect(result.loras).toEqual([]);
    });

    it("should return empty loras and unchanged prompt with no tokens", () => {
      const result = parseLoraTokens("a beautiful sunset over mountains");
      expect(result.cleanPrompt).toBe("a beautiful sunset over mountains");
      expect(result.loras).toEqual([]);
    });

    it("should handle LoRA tokens surrounded by extra whitespace", () => {
      const result = parseLoraTokens("art   <lora:pixel_art:0.8>   style");
      expect(result.cleanPrompt).toBe("art style");
      expect(result.loras).toEqual([{ file: "pixel_art", weight: 0.8 }]);
    });
  });

  describe("convertToDanbooruStyle", () => {
    it("should convert natural language to comma-separated tags", () => {
      const result = convertToDanbooruStyle("a woman smiling and wearing a red dress");
      expect(result).toContain(",");
      expect(result).toContain("1girl");
      expect(result).toContain("smile");
      expect(result).toContain("wearing");
    });

    it("should handle complex prompts", () => {
      const result = convertToDanbooruStyle(
        "a girl with blue hair standing in a field of flowers"
      );
      expect(result).toContain(",");
      expect(result).toContain("1girl");
      expect(result).toContain("standing");
    });
  });

  describe("addPonyTags", () => {
    it("should add score tags to prompt", () => {
      const result = addPonyTags("a beautiful woman");
      expect(result).toContain("score_9");
      expect(result).toContain("score_8_up");
      expect(result).toContain("score_7_up");
      expect(result).toContain("a beautiful woman");
    });

    it("should not add duplicate score tags", () => {
      const result = addPonyTags("score_9, already has score tags");
      expect(result.split("score_").length).toBeLessThanOrEqual(3); // score_9, score_8_up, etc
    });
  });

  describe("optimizePrompt", () => {
    it("should optimize for SD 1.5", () => {
      const result = optimizePrompt("a woman smiling", "sd15");
      // SD 1.5 converts to tag-style but may not always have commas
      expect(result).toContain("1girl");
      expect(result).toContain("smile");
    });

    it("should optimize for Pony", () => {
      const result = optimizePrompt("a beautiful woman", "pony");
      expect(result).toContain("score_9");
      expect(result).toContain("source_");
    });

    it("should keep natural language for SDXL", () => {
      const result = optimizePrompt("a woman smiling", "sdxl");
      expect(result).toBe("a woman smiling");
    });

    it("should keep natural language for FLUX", () => {
      const result = optimizePrompt("a woman smiling", "flux");
      expect(result).toBe("a woman smiling");
    });
  });

  describe("getNegativePrompt", () => {
    it("should return common negatives for all models", () => {
      const result = getNegativePrompt("sd15");
      expect(result).toContain("worst quality");
      expect(result).toContain("low quality");
      expect(result).toContain("bad anatomy");
    });

    it("should include pony-specific negatives", () => {
      const result = getNegativePrompt("pony");
      expect(result).toContain("source_pony");
      expect(result).toContain("source_furry");
    });
  });

  describe("getDefaultSize", () => {
    it("should return 512x512 for SD 1.5", () => {
      expect(getDefaultSize("sd15")).toEqual({ width: 512, height: 512 });
    });

    it("should return 1024x1024 for other models", () => {
      expect(getDefaultSize("sdxl")).toEqual({ width: 1024, height: 1024 });
      expect(getDefaultSize("pony")).toEqual({ width: 1024, height: 1024 });
      expect(getDefaultSize("flux")).toEqual({ width: 1024, height: 1024 });
      expect(getDefaultSize("unknown")).toEqual({ width: 1024, height: 1024 });
    });
  });

  describe("getRecommendedSteps", () => {
    it("should return 25 for SD 1.5", () => {
      expect(getRecommendedSteps("sd15")).toBe(25);
    });

    it("should return 4 for FLUX", () => {
      expect(getRecommendedSteps("flux")).toBe(4);
    });

    it("should return 20 for other models", () => {
      expect(getRecommendedSteps("sdxl")).toBe(20);
      expect(getRecommendedSteps("pony")).toBe(20);
      expect(getRecommendedSteps("unknown")).toBe(20);
    });
  });

  describe("getRecommendedCfg", () => {
    it("should return 7 for SD 1.5", () => {
      expect(getRecommendedCfg("sd15")).toBe(7);
    });

    it("should return 3 for FLUX", () => {
      expect(getRecommendedCfg("flux")).toBe(3);
    });

    it("should return 7 for other models", () => {
      expect(getRecommendedCfg("sdxl")).toBe(7);
      expect(getRecommendedCfg("pony")).toBe(7);
      expect(getRecommendedCfg("unknown")).toBe(7);
    });
  });

  describe("Constants", () => {
    it("should export default sizes", () => {
      expect(DEFAULT_SIZE).toEqual({ width: 1024, height: 1024 });
      expect(SD15_SIZE).toEqual({ width: 512, height: 512 });
    });
  });
});

describe("Model metadata", () => {
  it("should expose catalog defaults", () => {
    const model = getModelMetadata(DEFAULT_DRAW_THINGS_MODEL);
    expect(model.type).toBe("sd1");
    expect(model.defaultSize).toEqual({ width: 512, height: 512 });
    expect(model.promptMode).toBe("tagged");
  });

  it("should infer metadata for unknown flux models", () => {
    const model = getModelMetadata("my_flux_model.ckpt");
    expect(model.type).toBe("flux");
    expect(model.defaultSteps).toBe(4);
    expect(model.defaultCfg).toBe(3);
  });

  it("should include configured model in known model IDs", () => {
    expect(getKnownModelIds("custom.ckpt")[0]).toBe("custom.ckpt");
    expect(getKnownModelIds()).toContain(DEFAULT_DRAW_THINGS_MODEL);
  });

  it("should convert aspect ratios to rounded dimensions", () => {
    expect(sizeForAspectRatio("1:1")).toEqual({ width: 1024, height: 1024 });
    expect(sizeForAspectRatio("16:9")?.width).toBeGreaterThan(1024);
    expect(sizeForAspectRatio("bad")).toBeNull();
  });

  it("should publish geometry capabilities constants", () => {
    expect(DRAW_THINGS_SUPPORTED_SIZES).toContain("1024x1024");
    expect(DRAW_THINGS_ASPECT_RATIOS).toContain("16:9");
    expect(DRAW_THINGS_RESOLUTIONS).toContain("1K");
  });

  it("should keep generated catalog free of local downloaded state", () => {
    expect(DRAW_THINGS_CLI_MODEL_CATALOG.length).toBeGreaterThan(0);
    expect(DRAW_THINGS_CLI_MODEL_CATALOG[0]).toHaveProperty("baseType");
    expect(DRAW_THINGS_CLI_MODEL_CATALOG[0]).toHaveProperty("purpose");
    expect(DRAW_THINGS_CLI_MODEL_CATALOG[0]).not.toHaveProperty("downloaded");
  });
});

describe("Draw Things CLI model parsing", () => {
  const modelListOutput = `Models directory: /Users/andres/Library/Containers/com.liuliu.draw-things/Data/Documents/Models
MODEL                           NAME                   SOURCE    DOWNLOADED  HUGGING_FACE
------------------------------  ---------------------  --------  ----------  ------------
realistic_vision_v5.1_f16.ckpt  Realistic Vision v5.1  official  yes         -
flux_2_klein_4b_q6p.ckpt        FLUX.2 [klein] 4B      official  no          black-forest-labs/FLUX.2-klein-4B
`;

  it("should parse draw-things-cli models list table", () => {
    const models = parseDrawThingsModelsList(modelListOutput);
    expect(models).toHaveLength(2);
    expect(models[0]).toEqual({
      model: "realistic_vision_v5.1_f16.ckpt",
      name: "Realistic Vision v5.1",
      source: "official",
      downloaded: true,
    });
    expect(models[1]).toMatchObject({
      model: "flux_2_klein_4b_q6p.ckpt",
      downloaded: false,
      huggingFace: "black-forest-labs/FLUX.2-klein-4B",
    });
  });

  it("should return an empty list for unrecognized output", () => {
    expect(parseDrawThingsModelsList("not a table")).toEqual([]);
  });

  it("should choose downloaded fallback models predictably", () => {
    expect(chooseDownloadedModel("missing.ckpt", [DEFAULT_DRAW_THINGS_MODEL])).toBe(DEFAULT_DRAW_THINGS_MODEL);
    expect(chooseDownloadedModel("missing.ckpt", ["custom.ckpt"], "custom.ckpt")).toBe("custom.ckpt");
    expect(chooseDownloadedModel("custom.ckpt", ["custom.ckpt"])).toBe("custom.ckpt");
    expect(chooseDownloadedModel("missing.ckpt", [])).toBe("missing.ckpt");
  });
});

describe("Image generation provider internals", () => {
  const baseReq = {
    provider: "draw-things",
    model: DEFAULT_DRAW_THINGS_MODEL,
    prompt: "a woman smiling",
    cfg: {},
  } as ImageGenerationRequest;

  it("should build SD 1.5 high-res settings with upscaling", () => {
    const settings = buildGenerationSettingsForModel(
      { ...baseReq, size: "1024x1024" },
      {},
      DEFAULT_DRAW_THINGS_MODEL
    );

    expect(settings.width).toBe(512);
    expect(settings.height).toBe(512);
    expect(settings.targetWidth).toBe(1024);
    expect(settings.targetHeight).toBe(1024);
    expect(settings.needsUpscaling).toBe(true);
    expect(settings.modelType).toBe("sd1");
  });

  it("should keep FLUX natural prompts and model defaults", () => {
    const settings = buildGenerationSettingsForModel(
      { ...baseReq, model: "flux_2_klein_4b_q6p.ckpt" },
      {},
      "flux_2_klein_4b_q6p.ckpt"
    );

    expect(settings.width).toBe(1024);
    expect(settings.height).toBe(1024);
    expect(settings.steps).toBe(4);
    expect(settings.cfg).toBe(3);
    expect(settings.optimizedPrompt).toBe(baseReq.prompt);
  });

  it("should use configured defaultSize for CLI width and height when request size is omitted", () => {
    const settings = buildGenerationSettingsForModel(
      { ...baseReq, aspectRatio: "16:9" },
      { defaultSize: "1024x1024" },
      "sd_xl_base_1.0_f16.ckpt"
    );
    const args = buildGenerateArgs(settings, {}, undefined);

    expect(settings.width).toBe(1024);
    expect(settings.height).toBe(1024);
    expect(args).toContain("--width");
    expect(args[args.indexOf("--width") + 1]).toBe("1024");
    expect(args).toContain("--height");
    expect(args[args.indexOf("--height") + 1]).toBe("1024");
  });

  it("should reduce configured defaultSize dimensions to Draw Things multiples of 64", () => {
    const settings = buildGenerationSettingsForModel(
      { ...baseReq },
      { defaultSize: "1100x1100" },
      "sd_xl_base_1.0_f16.ckpt"
    );
    const args = buildGenerateArgs(settings, {}, undefined);

    expect(settings.width).toBe(1088);
    expect(settings.height).toBe(1088);
    expect(args[args.indexOf("--width") + 1]).toBe("1088");
    expect(args[args.indexOf("--height") + 1]).toBe("1088");
  });

  it("should build CLI args including img2img options and models dir", () => {
    const settings = buildGenerationSettingsForModel(
      { ...baseReq, size: "512x512" },
      { modelsDir: "~/Models", defaultEditStrength: 0.35 },
      DEFAULT_DRAW_THINGS_MODEL
    );
    const args = buildGenerateArgs(settings, { modelsDir: "~/Models" }, "/tmp/input.png");

    expect(args).toContain("generate");
    expect(args).toContain("--image");
    expect(args).toContain("/tmp/input.png");
    expect(args).toContain("--strength");
    expect(args).toContain("0.35");
    expect(args).toContain("--models-dir");
  });

  it("should pass configured Draw Things JSON overrides to generation", () => {
    const settings = buildGenerationSettingsForModel(
      { ...baseReq, size: "512x512" },
      {},
      DEFAULT_DRAW_THINGS_MODEL
    );
    const configJson = {
      sampler: 12,
      hiresFix: false,
      loras: [{ mode: "all", file: "breath_of_the_wild_style_lora_f16.ckpt", weight: 1 }],
    };
    const args = buildGenerateArgs(settings, { defaultConfigJson: configJson });

    expect(args[args.indexOf("--config-json") + 1]).toBe(JSON.stringify(configJson));
  });

  it("should append Draw Things JSON overrides to subsequent generation passes", () => {
    const args: string[] = [];
    appendConfigJsonArgs(args, { defaultConfigJson: { upscaler: "realesrgan" } });

    expect(args).toEqual(["--config-json", '{"upscaler":"realesrgan"}']);
  });

  it("should append configured default prompt before optimization", () => {
    expect(appendDefaultPrompt("a woman smiling", "watercolor, soft brush strokes")).toBe(
      "a woman smiling, watercolor, soft brush strokes"
    );
    expect(appendDefaultPrompt("a woman smiling", "   ")).toBe("a woman smiling");

    const settings = buildGenerationSettingsForModel(
      { ...baseReq },
      { defaultPromptMode: "natural", defaultPromptAppend: "watercolor, soft brush strokes" },
      "sd_xl_base_1.0_f16.ckpt"
    );

    expect(settings.optimizedPrompt).toBe("a woman smiling, watercolor, soft brush strokes");
  });

  it("should respect prompt mode overrides", () => {
    expect(optimizePromptForMode("a woman smiling", "natural", "sd15")).toBe("a woman smiling");
    expect(optimizePromptForMode("a woman smiling", "tagged", "sd15")).toContain("1girl");
  });

  it("should parse LoRA tokens from prompt and inject them into config-json", () => {
    const settings = buildGenerationSettingsForModel(
      { ...baseReq, prompt: "a woman smiling <lora:detailed_eyes:0.7>" },
      {},
      DEFAULT_DRAW_THINGS_MODEL
    );

    expect(settings.loras).toEqual([{ file: "detailed_eyes", weight: 0.7 }]);
    expect(settings.optimizedPrompt).not.toContain("lora");

    const args = buildGenerateArgs(settings, {}, undefined);
    const configJsonArg = args[args.indexOf("--config-json") + 1];
    const parsed = JSON.parse(configJsonArg);
    expect(parsed.loras).toEqual([{ mode: "all", file: "detailed_eyes", weight: 0.7 }]);
  });

  it("should merge parsed LoRAs with existing defaultConfigJson loras", () => {
    const settings = buildGenerationSettingsForModel(
      { ...baseReq, prompt: "art <lora:pixel_art:0.9>" },
      {},
      DEFAULT_DRAW_THINGS_MODEL
    );

    const args = buildGenerateArgs(settings, {
      defaultConfigJson: { loras: [{ mode: "all", file: "base_style.ckpt", weight: 1 }] },
    }, undefined);

    const configJsonArg = args[args.indexOf("--config-json") + 1];
    const parsed = JSON.parse(configJsonArg);
    expect(parsed.loras).toHaveLength(2);
    expect(parsed.loras[0]).toEqual({ mode: "all", file: "base_style.ckpt", weight: 1 });
    expect(parsed.loras[1]).toEqual({ mode: "all", file: "pixel_art", weight: 0.9 });
  });

  it("should not include config-json arg when no loras and no defaultConfigJson", () => {
    const settings = buildGenerationSettingsForModel(baseReq, {}, DEFAULT_DRAW_THINGS_MODEL);
    const args = buildGenerateArgs(settings, {}, undefined);

    expect(args).not.toContain("--config-json");
  });
});

describe("Plugin exports", () => {
  it("should have a default export", async () => {
    const module = await import("./index.js");
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe("object");
  });

  it("should merge full OpenClaw plugin config over pluginConfig defaults", async () => {
    const { resolveStartupConfig } = await import("./index.js");
    const config = resolveStartupConfig({
      config: {
        plugins: {
          entries: {
            "draw-things": {
              enabled: true,
              config: {
                modelsDir: "/Volumes/ExtSD1/SD/Models",
                cliPath: "draw-things-cli",
                defaultModel: "realistic_vision_v5.1_f16.ckpt",
              },
            },
          },
        },
      },
      pluginConfig: {
        cliPath: "draw-things-cli",
        outputDir: "~/Downloads/draw-things-output",
      },
    } as any);

    expect(config.modelsDir).toBe("/Volumes/ExtSD1/SD/Models");
    expect(config.defaultModel).toBe("realistic_vision_v5.1_f16.ckpt");
    expect(config.outputDir).toBe("~/Downloads/draw-things-output");
  });

  it("should register image provider even when modelsDir is absent at startup", async () => {
    const module = await import("./index.js");
    const imageProviders: any[] = [];
    const textProviders: any[] = [];

    module.default.register({
      config: {},
      pluginConfig: {},
      registerProvider: (provider: any) => textProviders.push(provider),
      registerImageGenerationProvider: (provider: any) => imageProviders.push(provider),
    } as any);

    expect(textProviders).toHaveLength(0);
    expect(imageProviders.map((provider) => provider.id)).toContain("draw-things");
  });
});
