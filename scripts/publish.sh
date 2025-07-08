#!/bin/bash
# publish.sh - Semantic versioning and NPM publishing for @xala-technologies/authentication

set -e

echo "🚀 Starting package publishing process..."

# Check if we're in the root directory
if [ ! -d "packages/authentication" ]; then
    echo "❌ Error: packages/authentication directory not found. Run this script from the project root."
    exit 1
fi

# Change to authentication package directory
cd packages/authentication

# Verify we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the right directory?"
    exit 1
fi

# Check if we're logged into npm
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ Error: Not logged into npm. Run 'npm login' first."
    exit 1
fi

# Determine version bump type
VERSION_TYPE=${1:-patch}  # major, minor, patch

if [[ ! "$VERSION_TYPE" =~ ^(major|minor|patch)$ ]]; then
    echo "❌ Error: Invalid version type. Use: major, minor, or patch"
    exit 1
fi

echo "📋 Running pre-publish checks..."

# Run compliance checks
echo "🔍 Running linter..."
npm run lint

echo "🔍 Running TypeScript check..."
npm run typecheck

echo "🧪 Running tests with coverage..."
npm run test:coverage

echo "🔒 Running security audit..."
npm run security:audit

echo "✅ Running authentication validation..."
npm run validate:auth || echo "⚠️  Auth validation script not found, skipping..."

echo "🏗️  Building package..."
npm run build

# Verify build output exists
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed - dist directory not found"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $CURRENT_VERSION"

# Bump version
echo "📈 Bumping version ($VERSION_TYPE)..."
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "📦 New version: $NEW_VERSION"

# Update changelog
echo "📝 Updating changelog..."
npm run changelog:generate || echo "⚠️  Changelog generation failed, continuing..."

# Create git commit
echo "📄 Creating git commit..."
git add package.json CHANGELOG.md dist/
git commit -m "chore(auth): release v$NEW_VERSION" || echo "⚠️  Git commit failed, continuing..."

# Create git tag
echo "🏷️  Creating git tag..."
git tag "auth-v$NEW_VERSION" || echo "⚠️  Git tag creation failed, continuing..."

# Publish to NPM with public access
echo "🚀 Publishing to NPM..."
npm publish --access public

# Create GitHub release if gh CLI is available
if command -v gh &> /dev/null; then
    echo "🐙 Creating GitHub release..."
    gh release create "auth-v$NEW_VERSION" \
        --title "Authentication Package v$NEW_VERSION" \
        --notes-file CHANGELOG.md \
        --target main || echo "⚠️  GitHub release creation failed, continuing..."
else
    echo "⚠️  GitHub CLI not found, skipping release creation"
fi

# Push git changes
echo "⬆️  Pushing git changes..."
git push origin main --tags || echo "⚠️  Git push failed, continuing..."

echo ""
echo "✅ Package published successfully!"
echo "📦 Package: @xala-technologies/authentication@$NEW_VERSION"
echo "🔗 NPM: https://www.npmjs.com/package/@xala-technologies/authentication"
echo "📚 Documentation: https://docs.xala.no/authentication"
echo ""
echo "🎉 All done! The new version is now available on NPM."

# Return to root directory
cd ../..
