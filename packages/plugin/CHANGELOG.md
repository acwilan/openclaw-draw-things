# Changelog

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