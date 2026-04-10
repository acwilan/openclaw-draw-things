# OpenClaw Draw Things

Local AI image generation for OpenClaw using [Draw Things](https://drawthings.ai/) CLI on Apple Silicon. Generate images with Stable Diffusion, FLUX, and other models without API costs.

## Features

- 🖼️ **Local image generation** - No API keys needed
- 🍎 **Apple Silicon optimized** - Uses Core ML for fast inference
- 🤖 **Multiple models** - SD, FLUX, and more
- ⚡ **OpenClaw integration** - Native tool support

## Installation

### Prerequisites

- macOS with Apple Silicon (M1/M2/M3)
- [Draw Things](https://drawthings.ai/) app installed
- OpenClaw 2026.4.0 or later

### Install from ClawHub

```bash
openclaw plugins install draw-things
```

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
          "defaultSteps": 20,
          "defaultCfg": 7
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
| `defaultModel` | string | - | Default model file (e.g., `flux_2_klein_4b_q6p.ckpt`) |
| `defaultWidth` | number | 1024 | Default output width (multiple of 64) |
| `defaultHeight` | number | 1024 | Default output height (multiple of 64) |
| `defaultSteps` | number | 20 | Sampling steps (higher = better quality, slower) |
| `defaultCfg` | number | 7 | CFG guidance scale (higher = stricter prompt adherence) |

## Usage

Once installed and configured, OpenClaw can generate images:

```
Generate an image of a sunset over mountains
```

Or use explicit tool calls:

```
Use image_generate to create a cartoon cat
```

## Models

Download models from the Draw Things model browser. Common models include:

- `realistic_vision_v5.1_f16.ckpt` - Photorealistic images
- `flux_2_klein_4b_q6p.ckpt` - FLUX.2 Klein 4-bit quantized
- `sd_xl_base_1.0_f16.ckpt` - Stable Diffusion XL

Place models in `~/Library/Containers/com.liuliu.draw-things/Data/Documents/Models/` or specify a custom `modelsDir` in config.

## Development

```bash
npm install
npm run build
npm run dev        # Watch mode
npm test           # Run tests
```

## License

MIT © Andres Rovira

## Links

- [GitHub](https://github.com/acwilan/openclaw-draw-things)
- [Draw Things](https://drawthings.ai/)
- [OpenClaw](https://openclaw.ai/)
