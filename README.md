# OpenClaw Draw Things

Local AI image generation for OpenClaw using [Draw Things](https://drawthings.ai/) CLI on Apple Silicon Macs.

[![ClawHub](https://img.shields.io/badge/ClawHub-openclaw--draw--things-blue)](https://clawhub.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Two Ways to Install

This repository provides **both** a ClawHub plugin and a local skill:

| Method | Best For | Install Command |
|--------|----------|-----------------|
| **ClawHub Plugin** | Most users, automatic updates | `openclaw plugins install openclaw-draw-things` |
| **Local Skill** | Development, customization | Copy `packages/skill/` to `~/.openclaw/skills/draw-things/` |

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

## 📋 Prerequisites

- macOS with Apple Silicon (M1/M2/M3/M4)
- [Draw Things](https://apps.apple.com/us/app/draw-things-ai-generation/id6444050820) app installed
- [Draw Things CLI](https://releases.drawthings.ai/p/draw-things-cli-local-media-generation) installed

## 🚀 Quick Start

### Option 1: ClawHub Plugin (Recommended)

```bash
# Install from ClawHub
openclaw plugins install openclaw-draw-things

# Configure in ~/.openclaw/openclaw.json
{
  "plugins": {
    "entries": {
      "draw-things": {
        "enabled": true,
        "config": {
          "defaultModel": "flux_2_klein_4b_q6p.ckpt"
        }
      }
    }
  }
}

# Restart gateway
openclaw gateway restart
```

### Option 2: Local Skill

```bash
# Clone and copy skill folder
git clone https://github.com/acwilan/openclaw-draw-things.git
cp -r openclaw-draw-things/packages/skill ~/.openclaw/skills/draw-things

# Restart OpenClaw
openclaw gateway restart
```

## 🎨 Usage

Once installed, generate images:

```
/tool draw_things_generate prompt:"A cute robot helper"
```

Or with options:

```
/tool draw_things_generate prompt:"A sunset over mountains" aspectRatio:"16:9" steps:30
```

See full parameter documentation in [packages/skill/SKILL.md](packages/skill/SKILL.md).

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
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT © [acwilan](https://github.com/acwilan)

## 🙏 Credits

- [Draw Things](https://drawthings.ai/) by Liu Liu - Amazing local AI image generation
- [OpenClaw](https://openclaw.ai/) - The platform that makes this possible
