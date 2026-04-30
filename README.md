# OpenClaw Draw Things

Local AI image generation for OpenClaw using [Draw Things](https://drawthings.ai/) CLI on Apple Silicon. Generate images with Stable Diffusion, FLUX, and other models without API costs.

## Features

- 🖼️ **Local image generation** - No API keys needed
- 🎨 **Image editing (img2img)** - Transform existing images with AI
- 🍎 **Apple Silicon optimized** - Uses Core ML for fast inference
- 🤖 **Multiple models** - SD, FLUX, and more
- ⚡ **OpenClaw integration** - Native tool support

## Prerequisites

- **macOS with Apple Silicon** (M1/M2/M3/M4)
- **[Draw Things CLI](https://drawthings.ai/cli)** installed via Homebrew:
  ```bash
  brew tap drawthingsai/draw-things
  brew install draw-things-cli
  ```
- *(Optional)* **[Draw Things App](https://drawthings.ai/)** from Mac App Store — easier GUI for browsing and downloading models
- **OpenClaw 2026.4.0** or later
- **AI Models** downloaded (see Models section below)

> 💡 **Note**: Only the CLI is required. The Draw Things app is optional but provides a convenient GUI for browsing and downloading models.

## Installation

### From ClawHub (Recommended)

```bash
openclaw plugins install openclaw-draw-things --dangerously-force-unsafe-install
```

> ⚠️ **Security Notice**: This plugin executes shell commands to run the Draw Things CLI. OpenClaw's security scanner flags this as "dangerous code patterns". This is expected and necessary for the plugin to function — it uses `child_process` to spawn the `draw-things-cli` binary for local image generation. Use the `--dangerously-force-unsafe-install` flag to proceed with installation.

### Manual Installation

```bash
git clone https://github.com/acwilan/openclaw-draw-things.git
cd openclaw-draw-things
npm install
npm run build
openclaw plugins install "$(pwd)"
```

## Configuration

Add to your `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "draw-things": {
        "enabled": true,
        "config": {
          "cliPath": "draw-things-cli",
          "outputDir": "~/Downloads/draw-things-output",
          "defaultModel": "realistic_vision_v5.1_f16.ckpt",
          "defaultWidth": 1024,
          "defaultHeight": 1024,
          "defaultEditStrength": 0.5,
          "defaultPromptMode": "auto"
        }
      }
    }
  },
  "agents": {
    "defaults": {
      "imageGenerationModel": {
        "primary": "draw-things/realistic_vision_v5.1_f16.ckpt"
      }
    }
  }
}
```

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cliPath` | string | `draw-things-cli` | Path to Draw Things CLI binary |
| `modelsDir` | string | - | Optional override for models directory |
| `outputDir` | string | `~/Downloads/draw-things-output` | Where to save generated images |
| `defaultModel` | string | `realistic_vision_v5.1_f16.ckpt` | Default model file |
| `defaultWidth` | number | model-specific | Default output width (rounded to multiple of 64) |
| `defaultHeight` | number | model-specific | Default output height (rounded to multiple of 64) |
| `defaultSteps` | number | model-specific | Override sampling steps |
| `defaultCfg` | number | model-specific | Override CFG guidance scale |
| `defaultEditStrength` | number | 0.5 | Img2img/edit strength from 0-1 |
| `defaultPromptMode` | string | `auto` | `auto`, `natural`, or `tagged` prompt handling |
| `enablePromptOptimization` | boolean | mode-dependent | Enable/disable model-aware prompt conversion |
| `highResSteps` | number | 15 | SD 1.5 high-resolution img2img upscale steps |
| `timeoutMs` | number | 300000 | Per-generation CLI timeout in milliseconds |

## Models

The provider now uses a generated Draw Things CLI model catalog plus curated overrides for defaults like size, steps, CFG, prompt mode, and high-resolution behavior. Unknown model names still work via best-effort type inference, but adding curated overrides in `src/model-metadata.ts` gives more predictable behavior.

At runtime, the plugin checks `draw-things-cli models list --downloaded-only` and falls back to a downloaded model if the configured/requested model is not present locally.

Models are stored in:  
`~/Library/Containers/com.liuliu.draw-things/Data/Documents/Models/`

Or specify a custom `modelsDir` in the plugin config.

### Downloading Models via CLI

If you prefer not to use the Draw Things app, you can download models entirely via CLI:

```bash
# List currently downloaded models
draw-things-cli models list --downloaded-only

# List all available models for download
draw-things-cli models list

# Download a specific model
draw-things-cli models ensure --model <model-name>
```

> 💡 **Tip**: If using a custom models directory, add `--models-dir <path>` to match your plugin config.

### Recommended Models

| Model | Description |
|-------|-------------|
| `realistic_vision_v5.1_f16.ckpt` | Photorealistic images (recommended default) |
| `flux_2_klein_4b_q6p.ckpt` | FLUX.2 Klein 4-bit quantized (fast, good quality) |
| `flux_1_schnell_4b_q8p.ckpt` | FLUX.1 Schnell for fast generation |
| `sd_xl_base_1.0_f16.ckpt` | Stable Diffusion XL |

**Via Draw Things App** (optional GUI method):  
Open Draw Things app → Models → Download Models

## Usage

Once installed and configured, OpenClaw can generate images:

```
Generate an image of a sunset over mountains
```

Or use explicit tool calls:

```
Use image_generate to create a cartoon cat
```

### Image Editing (img2img)

Transform existing images using AI:

```
Turn this photo into a watercolor painting [attach image]
```

Or explicitly:

```
Edit this image to look like a comic book style
```

The plugin supports:
- **One input image** per edit request
- **Configurable strength** via `defaultEditStrength` (how much the image changes)
- **Style transformations** - watercolor, oil painting, cartoon, etc.
- **Detail enhancement** - improve or modify specific aspects

**Tips for best results:**
- Use clear style descriptions (e.g., "oil painting", "anime style", "sketch")
- For subtle changes, the strength is moderate (0.5)
- Works with any supported model

## Troubleshooting

### Provider does not show as configured

The plugin reports configured only when it can find `draw-things-cli`, the output path is plausible, and `draw-things-cli models list --downloaded-only` returns at least one local model.

### "No image-generation provider registered"

Make sure the `imageGenerationModel.primary` is set correctly:
```json
"imageGenerationModel": {
  "primary": "draw-things/your-model.ckpt"
}
```

### "Model not found"

- Verify the model file exists in Draw Things
- Check the exact filename in the Models directory
- Ensure `modelsDir` config matches your setup if using custom location

### "draw-things-cli command not found"

Install the CLI via Homebrew:
```bash
brew tap drawthingsai/draw-things
brew install draw-things-cli
```

### Plugin not loading

Check the plugin is enabled:
```bash
openclaw plugins list
```

If needed, restart the gateway:
```bash
openclaw gateway restart
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test
```

### Releasing

```bash
# Patch version (1.0.0 → 1.0.1)
npm run release:patch

# Minor version (1.0.0 → 1.1.0)
npm run release:minor

# Major version (1.0.0 → 2.0.0)
npm run release:major
```

This handles version bump, manifest sync, changelog, commit, tag, and push automatically.

## License

MIT © Andres Rovira

## Links

- [GitHub](https://github.com/acwilan/openclaw-draw-things)
- [Draw Things](https://drawthings.ai/)
- [Draw Things CLI](https://drawthings.ai/cli)
- [OpenClaw](https://openclaw.ai/)
- [ClawHub Package](https://clawhub.ai)
