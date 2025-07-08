#!/bin/bash
# setup-dev.sh - Development environment setup for authentication package

set -e

echo "🔧 Setting up development environment for @xala-technologies/authentication..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 18+ or later."
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Install dependencies in authentication package
echo "📦 Installing authentication package dependencies..."
cd packages/authentication

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in packages/authentication"
    exit 1
fi

# Install dependencies
npm install

# Run initial build to verify everything works
echo "🏗️ Running initial build..."
npm run build

# Run linting
echo "🔍 Running linter..."
npm run lint

# Run TypeScript check
echo "📝 Running TypeScript check..."
npm run typecheck

# Run tests
echo "🧪 Running tests..."
npm run test

# Generate initial coverage report
echo "📊 Generating coverage report..."
npm run test:coverage

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Copy .env.example to .env and configure your environment variables"
echo "  2. Update provider credentials in .env file"
echo "  3. Run 'npm run dev:start' to start development server"
echo "  4. Run 'npm run test:watch' for continuous testing"
echo ""
echo "📚 Documentation:"
echo "  - README.md: Complete package documentation"
echo "  - __tests__/: Test examples and mock setups"
echo "  - src/types/: TypeScript type definitions"
echo ""
echo "🚀 Ready to develop!"

# Return to root directory
cd ../..