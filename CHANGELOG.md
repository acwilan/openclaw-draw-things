## [1.1.7](https://github.com/acwilan/openclaw-draw-things/compare/v1.1.6...v1.1.7) (2026-04-10)


### Code Refactoring

* flatten to root-level plugin structure ([c5add37](https://github.com/acwilan/openclaw-draw-things/commit/c5add37f2a2c3f5e2d5d7b3a8e9f1c2b4d6e8a0))
* rename npm package to draw-things ([df0beba](https://github.com/acwilan/openclaw-draw-things/commit/df0beba))


### Features

* change plugin ID to draw-things for ClawHub compatibility ([b3d6b53](https://github.com/acwilan/openclaw-draw-things/commit/b3d6b5356a00c63109e181120c10fff5d21ef8fc))
## [1.1.6](https://github.com/acwilan/openclaw-draw-things/compare/v1.1.5...v1.1.6) (2026-04-10)


### Features

* change plugin ID to draw-things for ClawHub compatibility ([b3d6b53](https://github.com/acwilan/openclaw-draw-things/commit/b3d6b5356a00c63109e181120c10fff5d21ef8fc))
## [1.1.6](https://github.com/acwilan/openclaw-draw-things/compare/v1.1.5...v1.1.6) (2026-04-10)
## [1.1.5](https://github.com/acwilan/openclaw-draw-things/compare/v1.1.4...v1.1.5) (2026-04-10)


### Bug Fixes

* update openclaw.plugin.json version to 1.1.4 ([03005af](https://github.com/acwilan/openclaw-draw-things/commit/03005af8446823fec8d665df06bfed8e5c52eff8))
## [1.1.4](https://github.com/acwilan/openclaw-draw-things/compare/v1.1.3...v1.1.4) (2026-04-10)


### Bug Fixes

* revert provider ID back to @acwilan/draw-things ([b968370](https://github.com/acwilan/openclaw-draw-things/commit/b9683709762df2a663b6d27869e5d25baac00b00))
## [1.1.2](https://github.com/acwilan/openclaw-draw-things/compare/v1.1.1...v1.1.2) (2026-04-10)


### Bug Fixes

* change provider ID from @acwilan/draw-things to draw-things ([af1d802](https://github.com/acwilan/openclaw-draw-things/commit/af1d8029c18c92c2dee71acf58e59f4d111bc819))
## [1.1.1](https://github.com/acwilan/openclaw-draw-things/compare/v1.1.0...v1.1.1) (2026-04-10)


### Bug Fixes

* update openclaw.plugin.json version to match package.json ([53e0a48](https://github.com/acwilan/openclaw-draw-things/commit/53e0a483f07ca805d4a0a4cb35b500b07bc16f78))
# [1.1.0](https://github.com/acwilan/openclaw-draw-things/compare/v1.0.3...v1.1.0) (2026-04-10)


### Bug Fixes

* add contracts declaration for image generation capability ([b7ce92c](https://github.com/acwilan/openclaw-draw-things/commit/b7ce92c7bbe5680c23a3513183a38786e0c4457c))
* align provider API with OpenClaw bundled providers ([2158ffc](https://github.com/acwilan/openclaw-draw-things/commit/2158ffcef732ca998b9c207ee273cf4dbfb043fe))
* improve plugin capabilities ([80dc413](https://github.com/acwilan/openclaw-draw-things/commit/80dc4136b16b04c514a1afab2bb3d12a308f2edc))


### Features

* update plugin definition ([01b1ccb](https://github.com/acwilan/openclaw-draw-things/commit/01b1ccb6fd65f12e1d567636b9b341968c120020))
# Changelog

## 1.0.7

- **CRITICAL**: Align provider API with bundled OpenClaw providers
- Changed method name from `generate()` to `generateImage()`
- Added provider metadata: `defaultModel`, `models`, `isConfigured()`, `capabilities`
- Changed entry point from compiled `./dist/index.js` to source `./src/index.ts`
- Removed `exports` section from plugin manifest
- Added `enabledByDefault: true` to plugin manifest
- Changed return format from `{ path }` to `{ buffer, mimeType, fileName }` (read files back into memory)
- Added `readFile` import from `node:fs/promises`
- These changes align our plugin with OpenClaw's bundled provider architecture
- Fixed npm build/test scripts to work from plugin directory

## 1.0.6

- **CRITICAL FIX**: Add `contracts.imageGenerationProviders` to plugin manifest
- This declares the plugin provides image generation capability to OpenClaw
- Required for `image_generate` tool to recognize the provider

## 1.0.5

- **SECURITY**: Re-added CLI path validation to provider-based architecture
- **SECURITY**: Re-added output directory validation
- Prevent path traversal attacks in image generation provider
- Validate binary names against allowlist
- Restrict output to home directory or /tmp

## 1.0.4

- **BREAKING**: Refactored from tool-based to provider-based architecture
- Now integrates with OpenClaw's native `image_generate` tool
- Uses `api.registerImageGenerationProvider()` instead of `api.registerTool()`
- Removed @sinclair/typebox dependency
- Added provider declaration in manifest

## 1.0.3

- Security hardening: Added CLI path validation
- Security hardening: Added output directory validation
- Prevent path traversal attacks
- Validate binary names against allowlist
- Restrict output to home directory or /tmp

## 1.0.2

- Reorganized as monorepo with plugin and skill packages
- Moved @sinclair/typebox to dependencies for runtime

## 1.0.1

- Fixed runtime dependency issue

## 1.0.0

- Initial release
- Image generation via Draw Things CLI
- Configurable model, dimensions, steps, CFG
- Support for multiple generations per request
- Aspect ratio mapping to dimensions