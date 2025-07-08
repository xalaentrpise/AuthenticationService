# Publishing Xala Authentication Package to NPM

## Prerequisites

1. **NPM Account**: You need an npm account. Create one at https://www.npmjs.com/signup
2. **NPM CLI**: Ensure npm is installed and you're logged in

## Step-by-Step Publishing Instructions

### 1. Login to NPM
```bash
npm login
```
Enter your npm username, password, and email when prompted.

### 2. Navigate to Package Directory
```bash
cd packages/authentication
```

### 3. Verify Package Configuration
```bash
cat package.json
```
Ensure the package name, version, and metadata are correct.

### 4. Build the Package
```bash
npm run build
```
This will compile TypeScript to JavaScript in the `dist/` directory.

### 5. Run Tests (Optional but Recommended)
```bash
npm test
```
Ensure all tests pass before publishing.

### 6. Check What Will Be Published
```bash
npm pack --dry-run
```
This shows you exactly what files will be included in the package.

### 7. Publish to NPM
```bash
npm publish
```

## If Package Name is Already Taken

If `@xala-technologies/authentication` is already taken, you have options:

### Option 1: Use Your Own Scope
```bash
# Change package name in package.json to use your npm username
# Example: "@your-username/authentication"
npm publish
```

### Option 2: Use Different Package Name
```bash
# Change package name in package.json
# Example: "xala-auth-system" or "norwegian-auth-package"
npm publish
```

## Post-Publishing Steps

### 1. Verify Package Published
```bash
npm view @xala-technologies/authentication
```

### 2. Test Installation
```bash
# In a test directory
npm install @xala-technologies/authentication
```

### 3. Update Documentation
Update the README.md installation instructions with the correct package name.

## Troubleshooting

### Permission Errors
If you get permission errors:
```bash
# Check if you're logged in
npm whoami

# Check package permissions
npm access ls-packages

# If using scoped package, ensure it's public
npm publish --access public
```

### Version Conflicts
If the version already exists:
```bash
# Update version in package.json
npm version patch  # or minor, major

# Then publish
npm publish
```

### Build Issues
If build fails:
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check for missing dependencies
npm install

# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## Publishing Checklist

- [ ] Package name is available or you have permissions
- [ ] Version number is incremented
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] Package.json metadata is correct
- [ ] README.md is included and up to date
- [ ] License file is included
- [ ] No sensitive information in published files
- [ ] Logged into npm with correct account

## Alternative: Private Registry

If you want to use a private registry:

```bash
# Set registry
npm config set registry https://your-private-registry.com

# Or publish to specific registry
npm publish --registry https://your-private-registry.com
```

## Commands Summary

```bash
# Quick publishing workflow
cd packages/authentication
npm login
npm run build
npm test
npm publish

# Verify
npm view @xala-technologies/authentication
```

## Notes

- The package is configured for public access
- MIT license is included
- All necessary files are in the `files` array in package.json
- Dependencies are properly specified
- TypeScript definitions are included