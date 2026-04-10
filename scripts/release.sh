#!/bin/bash
set -e

# Release script for OpenClaw Draw Things plugin
# Usage: ./scripts/release.sh [patch|minor|major]

VERSION_TYPE=${1:-patch}

echo "🚀 Starting release process..."

# Step 1: Update manifest version to match package.json after bump
echo "📦 Bumping version ($VERSION_TYPE)..."
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "New version: $NEW_VERSION"

# Step 2: Update openclaw.plugin.json
echo "📝 Updating openclaw.plugin.json..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('./openclaw.plugin.json', 'utf8'));
manifest.version = pkg.version;
fs.writeFileSync('./openclaw.plugin.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('Updated openclaw.plugin.json to', pkg.version);
"

# Step 3: Generate changelog
echo "📋 Generating changelog..."
npx conventional-changelog -p angular -i CHANGELOG.md -s

# Step 4: Stage all changes
echo "➕ Staging changes..."
git add package.json openclaw.plugin.json CHANGELOG.md

# Step 5: Commit
echo "💾 Committing..."
git commit -m "chore(release): v$NEW_VERSION"

# Step 6: Create tag
echo "🏷️  Creating tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Step 7: Push
echo "⬆️  Pushing to origin..."
git push origin main
git push origin "v$NEW_VERSION"

echo "✅ Release v$NEW_VERSION complete!"
echo "CI will now build and publish to npm and ClawHub."
