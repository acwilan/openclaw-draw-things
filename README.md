# OpenClaw Draw Things

Local AI image generation for OpenClaw using [Draw Things](https://drawthings.ai/) CLI on Apple Silicon Macs.

[![ClawHub](https://img.shields.io/badge/ClawHub-openclaw--draw--things-blue)](https://clawhub.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📋 Prerequisites

Before installing, ensure you have:

1. **macOS with Apple Silicon** (M1/M2/M3/M4 chip)
2. **Draw Things app** — Install from [App Store](https://apps.apple.com/us/app/draw-things-ai-generation/id6444050820)
3. **Draw Things CLI** — Download from [releases page](https://releases.drawthings.ai/p/draw-things-cli-local-media-generation) and:
   - Extract the binary
   - Move it to `/usr/local/bin/draw-things-cli` (or any location in your PATH)
   - Verify: `draw-things-cli --help`
4. **AI Models** — Download at least one model in Draw Things app:
   - Open Draw Things app
   - Go to **Models** → **Download Models**
   - Recommended: FLUX Schnell or FLUX Klein (fast, good quality)
   - Note the exact filename (e.g., `flux_2_klein_4b_q6p.ckpt`)

## 🎯 Two Ways to Install

This repository provides **both** a ClawHub plugin and a local skill:

| Method | Best For | Install Command |
|--------|----------|-----------------|
| **ClawHub Plugin** | Most users, automatic updates | `openclaw plugins install openclaw-draw-things` |
| **Local Skill** | Development, customization | Copy `packages/skill/` to `~/.openclaw/skills/draw-things/` |

## 🚀 Complete Setup Guide

### Step 1: Install Draw Things CLI

The easiest way to install the CLI is via Homebrew:

```bash
# Add the official Draw Things tap
brew tap drawthingsai/draw-things

# Install the CLI
brew install draw-things-cli

# Verify installation
draw-things-cli --help
```

**Alternative: Manual Installation**

If you prefer not to use Homebrew, download from the [official releases](https://github.com/drawthingsai/draw-things-cli/releases) and install manually.

### Step 2: Download AI Models in Draw Things App

1. Open **Draw Things** app
2. Click **Models** in the sidebar
3. Click **Download Models**
4. Choose a model (recommendations below)
5. Wait for download to complete
6. **Note the exact filename** — you'll need it for configuration

**Recommended Models:**

| Model | Speed | Quality | Filename Example |
|-------|-------|---------|------------------|
| FLUX Schnell | ⚡ Very Fast | Good | `flux_1_schnell_q8p.ckpt` |
| FLUX Klein 4B | Fast | Very Good | `flux_2_klein_4b_q6p.ckpt` |
| FLUX Dev | Slower | Best | `flux_1_dev_q8p.ckpt` |
| SDXL | Medium | Good | `sdxl_base_1.0_0.9vae.ckpt` |

### Step 3: Install OpenClaw Plugin

#### Option A: ClawHub Plugin (Recommended)

```bash
# Install from ClawHub
openclaw plugins install openclaw-draw-things
```

#### Option B: Local Skill

```bash
# Clone repository
git clone https://github.com/acwilan/openclaw-draw-things.git

# Copy skill to OpenClaw
cp -r openclaw-draw-things/packages/skill ~/.openclaw/skills/draw-things

# Or symlink for development
ln -s $(pwd)/openclaw-draw-things/packages/skill ~/.openclaw/skills/draw-things
```

### Step 4: Configure OpenClaw

Edit your `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "@acwilan/draw-things": {
        "enabled": true,
        "config": {
          "cliPath": "draw-things-cli",
          "defaultModel": "flux_2_klein_4b_q6p.ckpt",
          "outputDir": "~/Downloads/draw-things-output",
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

**Configuration Options:**

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `cliPath` | No | `draw-things-cli` | Path to CLI binary |
| `defaultModel` | **Yes** | — | Model filename from Draw Things |
| `outputDir` | No | `~/Downloads/draw-things-output` | Where images are saved |
| `defaultWidth` | No | `1024` | Image width (multiple of 64) |
| `defaultHeight` | No | `1024` | Image height (multiple of 64) |
| `defaultSteps` | No | `20` | Sampling steps (higher = better quality) |
| `defaultCfg` | No | `7.0` | CFG scale (prompt adherence) |

### Step 5: Restart OpenClaw Gateway

```bash
openclaw gateway restart
```

## 🎨 Usage Examples

Once configured, generate images via OpenClaw:

### Basic Generation

```
/tool draw_things_generate prompt:"A cute robot assistant with blue eyes"
```

### With Custom Size

```
/tool draw_things_generate prompt:"Sunset over mountains" width:1344 height:768
```

### With Aspect Ratio

```
/tool draw_things_generate prompt:"Portrait of a scientist" aspectRatio:"2:3"
```

### With Quality Settings

```
/tool draw_things_generate prompt:"Cyberpunk city" steps:30 cfg:8.5
```

### Full Example

```
/tool draw_things_generate prompt:"Serene lake in autumn" aspectRatio:"16:9" steps:25 cfg:7.5
```

## 🔧 Troubleshooting

### "draw-things-cli not found"

If you installed via Homebrew, make sure it's in your PATH:

```bash
# Check if CLI is in PATH
which draw-things-cli

# If not found, try reinstalling:
brew reinstall draw-things-cli
```

If you installed manually, ensure the binary is in a directory in your PATH:

```bash
# Or specify full path in config:
"cliPath": "/Applications/Draw Things.app/Contents/Resources/draw-things-cli"
```

### "Model not found"

- Verify model filename exactly matches in Draw Things app
- Check `Models` → `Manage Models` in Draw Things
- Ensure model downloaded completely

### "No images generated"

- Check `outputDir` exists and is writable
- Run Draw Things app at least once to initialize
- Check OpenClaw logs: `openclaw logs`

### Low quality images

- Increase `steps` (25-50 for better quality)
- Adjust `cfg` (6-8 for most prompts, higher = more literal)
- Try different models (FLUX Dev > FLUX Schnell for quality)

## 📦 Packages

This is a monorepo with two packages:

- **`packages/plugin/`** — ClawHub plugin (TypeScript, published to registry)
- **`packages/skill/`** — Local skill (JavaScript, direct install)

Both provide the same functionality — choose your preferred installation method.

## ✨ Features

- **🔒 100% Local** — No API costs, runs entirely on your Mac
- **⚡ Fast** — Core ML optimized for Apple Silicon
- **🎨 Multiple models** — Supports SD, FLUX, and other models via Draw Things
- **📐 Flexible sizing** — Aspect ratios or custom dimensions
- **🔧 Configurable** — Model, steps, CFG, output directory all customizable

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Test
npm run test

# Clean build artifacts
npm run clean

# Generate changelog
npm run changelog
```

### Publishing

```bash
# Publish plugin to ClawHub
npm run publish:plugin
```

## 📁 Repository Structure

```
openclaw-draw-things/
├── packages/
│   ├── plugin/           # ClawHub plugin
│   │   ├── src/
│   │   ├── package.json
│   │   └── openclaw.plugin.json
│   └── skill/            # Local skill
│       ├── index.js
│       └── SKILL.md
├── package.json          # Root monorepo config
├── README.md             # This file
└── LICENSE
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT © [acwilan](https://github.com/acwilan)

## 🙏 Credits

- [Draw Things](https://drawthings.ai/) by Liu Liu - Amazing local AI image generation
- [OpenClaw](https://openclaw.ai/) - The platform that makes this possible
