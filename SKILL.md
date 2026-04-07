# Draw Things Tool for OpenClaw

Local AI image generation for OpenClaw using [Draw Things](https://drawthings.ai/) CLI on Apple Silicon Macs.

## Features

- **🔒 100% Local** — No API costs, runs entirely on your Mac
- **⚡ Fast** — Core ML optimized for Apple Silicon
- **🎨 Multiple models** — Supports SD, FLUX, and other models via Draw Things
- **📐 Flexible sizing** — Aspect ratios or custom dimensions
- **🔧 Configurable** — Model, steps, CFG, output directory all customizable

## Prerequisites

- macOS with Apple Silicon (M1/M2/M3/M4)
- [Draw Things](https://apps.apple.com/us/app/draw-things-ai-generation/id6444050820) app installed (for model management)
- [Draw Things CLI](https://releases.drawthings.ai/p/draw-things-cli-local-media-generation) installed

## Installation

### Via Clawhub (Recommended)

```bash
clawhub install openclaw-draw-things
```

### Manual Install

```bash
git clone https://github.com/acwilan/openclaw-draw-things.git
cd openclaw-draw-things
openclaw plugins install .
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
          "defaultModel": "flux_2_klein_4b_q6p.ckpt",
          "defaultWidth": 1024,
          "defaultHeight": 1024,
          "defaultSteps": 20,
          "defaultCfg": 7.0
        }
      }
    }
  }
}
```

### Config Options

| Option | Default | Description |
|--------|---------|-------------|
| `cliPath` | `draw-things-cli` | Path to Draw Things CLI binary |
| `outputDir` | `~/Downloads/draw-things-output` | Where to save images. Supports `~` for home. |
| `modelsDir` | — | Optional override for models directory |
| `defaultModel` | — | Default model file (e.g., `flux_2_klein_4b_q6p.ckpt`) |
| `defaultWidth` | 1024 | Default width (multiple of 64) |
| `defaultHeight` | 1024 | Default height (multiple of 64) |
| `defaultSteps` | 20 | Sampling steps |
| `defaultCfg` | 7.0 | CFG guidance scale |

## Usage

Once configured, use the tool:

```
/tool draw-things-generate prompt:"A friendly lobster mascot"
```

Or with full parameters:

```
/tool draw-things-generate prompt:"A sunset over mountains" aspectRatio:"16:9" steps:30
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | ✅ | Image description |
| `aspectRatio` | — | `1:1`, `16:9`, `9:16`, `2:3`, `3:2`, etc. |
| `size` | — | Exact size like `1024x1024` |
| `width` | — | Width in pixels (overrides aspectRatio) |
| `height` | — | Height in pixels (overrides aspectRatio) |
| `model` | — | Model file to use |
| `steps` | — | Sampling steps (default: 20) |
| `cfg` | — | CFG scale (default: 7.0) |
| `negativePrompt` | — | What to exclude |
| `count` | — | Number of images (1-4, default: 1) |
| `seed` | — | Random seed for reproducibility |

## Supported Aspect Ratios

- `1:1` - Square (1024×1024)
- `2:3` - Portrait (832×1216)
- `3:2` - Landscape (1216×832)
- `3:4` - Portrait (896×1152)
- `4:3` - Landscape (1152×896)
- `4:5` - Portrait (896×1120)
- `5:4` - Landscape (1120×896)
- `9:16` - Portrait (768×1344)
- `16:9` - Landscape (1344×768)
- `21:9` - Ultra-wide (1536×640)

## Model Recommendations

| Model | Size | Quality | Speed |
|-------|------|---------|-------|
| FLUX 2 Klein | 4B | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| SDXL Base | 3.5B | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Realistic Vision | 2B | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Troubleshooting

### "Draw Things CLI not found"

```bash
# Check if CLI is in PATH
which draw-things-cli

# Or specify full path in config:
"cliPath": "/usr/local/bin/draw-things-cli"
```

### "Model not found"

Open Draw Things app and download models via the UI. Models are stored in:
```
~/Library/Containers/com.liuliu.draw-things/Data/Documents/Models/
```

### Generation takes too long

- Reduce `steps` (try 10-15)
- Use smaller models
- Close other apps using GPU

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test locally
openclaw plugins install .
```

## License

MIT

## Credits

- [Draw Things](https://drawthings.ai/) by Liu Liu
- [OpenClaw](https://openclaw.ai/) community
