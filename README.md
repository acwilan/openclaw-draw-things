# OpenClaw Draw Things Plugin

Local AI image generation for OpenClaw using [Draw Things](https://drawthings.ai/) CLI on Apple Silicon.

## Features

- **Local generation** — No API costs, runs entirely on your Mac
- **Multiple models** — Supports SD, FLUX, and other models via Draw Things
- **Native integration** — Registers as an OpenClaw image generation provider
- **Configurable** — Model, steps, CFG, dimensions all configurable

## Prerequisites

- macOS with Apple Silicon (M1/M2/M3/M4)
- [Draw Things](https://apps.apple.com/us/app/draw-things-ai-generation/id6444050820) app installed (for model management)
- [Draw Things CLI](https://releases.drawthings.ai/p/draw-things-cli-local-media-generation) installed

## Installation

```bash
# Install via OpenClaw
openclaw plugins install openclaw-draw-things

# Or clone and install locally
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
          "defaultModel": "flux_2_klein_4b_q6p.ckpt",
          "defaultWidth": 1024,
          "defaultHeight": 1024,
          "defaultSteps": 20,
          "defaultCfg": 7.0,
          "outputDir": "/tmp/openclaw-draw-things",
          "cliPath": "draw-things-cli"
        }
      }
    }
  },
  "agents": {
    "defaults": {
      "imageGenerationModel": {
        "primary": "draw-things"
      }
    }
  }
}
```

### Config Options

| Option | Default | Description |
|--------|---------|-------------|
| `defaultModel` | — | Model file or name (e.g., `flux_2_klein_4b_q6p.ckpt`) |
| `defaultWidth` | 1024 | Output width (multiple of 64) |
| `defaultHeight` | 1024 | Output height (multiple of 64) |
| `defaultSteps` | 20 | Sampling steps |
| `defaultCfg` | 7.0 | CFG guidance scale |
| `outputDir` | `/tmp/openclaw-draw-things` | Where to save generated images |
| `cliPath` | `draw-things-cli` | Path to CLI binary |
| `modelsDir` | — | Override models directory |

## Usage

Once configured, use OpenClaw's native image generation:

```
Generate an image of a friendly lobster mascot
```

Or with specific parameters:

```
Generate an image of a sunset over mountains, size 1344x768
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm run test
```

## License

MIT