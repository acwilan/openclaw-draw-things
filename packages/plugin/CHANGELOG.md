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