#!/usr/bin/env node
// validate-auth.js - Validation script for @xala-technologies/authentication

const fs = require('fs');
const path = require('path');

console.log('🔍 Running authentication package validation...');

// Check if we're in the authentication package directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found. Run this script from the authentication package directory.');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (packageJson.name !== '@xala-technologies/authentication') {
  console.error('❌ Error: This script should be run from the @xala-technologies/authentication package directory.');
  process.exit(1);
}

let issues = [];
let warnings = [];

// Validate package.json
console.log('📦 Validating package.json...');

if (!packageJson.version || !packageJson.version.match(/^\d+\.\d+\.\d+$/)) {
  issues.push('Invalid or missing version in package.json');
}

if (!packageJson.main || !fs.existsSync(path.join(process.cwd(), packageJson.main))) {
  issues.push('Main entry point does not exist: ' + packageJson.main);
}

if (!packageJson.types || !fs.existsSync(path.join(process.cwd(), packageJson.types))) {
  issues.push('TypeScript definitions do not exist: ' + packageJson.types);
}

// Check required fields
const requiredFields = ['name', 'version', 'description', 'author', 'license', 'keywords'];
requiredFields.forEach(field => {
  if (!packageJson[field]) {
    issues.push(`Missing required field in package.json: ${field}`);
  }
});

// Validate security dependencies
console.log('🔒 Validating security dependencies...');

const requiredDeps = ['jsonwebtoken', 'zod', 'axios'];
requiredDeps.forEach(dep => {
  if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
    issues.push(`Missing required dependency: ${dep}`);
  }
});

// Check for hardcoded secrets
console.log('🕵️ Checking for hardcoded secrets...');

const sourceFiles = [
  'src/**/*.ts',
  'src/**/*.js'
];

function scanFileForSecrets(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const secretPatterns = [
    /(?:password|secret|key|token)\s*[:=]\s*["'][^"']+["']/gi,
    /[A-Za-z0-9+/]{32,}={0,2}/g, // Base64-like strings
    /sk_[a-zA-Z0-9]{24,}/g, // Stripe-like secret keys
    /(?:client_secret|api_key|auth_token)\s*[:=]\s*["'][^"']+["']/gi
  ];
  
  secretPatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Skip common test values and environment variable references
        if (!match.includes('process.env') && 
            !match.includes('test-') && 
            !match.includes('mock-') &&
            !match.includes('example-') &&
            !match.includes('YOUR-') &&
            !match.includes('placeholder')) {
          warnings.push(`Potential hardcoded secret in ${filePath}: ${match.substring(0, 20)}...`);
        }
      });
    }
  });
}

// Scan source files
const srcDir = path.join(process.cwd(), 'src');
if (fs.existsSync(srcDir)) {
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.js')) {
        scanFileForSecrets(filePath);
      }
    });
  }
  walkDir(srcDir);
}

// Validate JWT configuration
console.log('🔑 Validating JWT configuration...');

const jwtConfigPath = path.join(process.cwd(), 'src/types/index.ts');
if (fs.existsSync(jwtConfigPath)) {
  const content = fs.readFileSync(jwtConfigPath, 'utf8');
  
  if (!content.includes('JWTConfig')) {
    issues.push('JWTConfig interface not found in types');
  }
  
  if (!content.includes('algorithm')) {
    issues.push('JWT algorithm configuration missing');
  }
} else {
  issues.push('Types definition file not found');
}

// Validate role definitions
console.log('👥 Validating RBAC configuration...');

if (fs.existsSync(jwtConfigPath)) {
  const content = fs.readFileSync(jwtConfigPath, 'utf8');
  
  if (!content.includes('RBACConfig')) {
    warnings.push('RBAC configuration interface not found');
  }
  
  if (!content.includes('RoleDefinition')) {
    warnings.push('Role definition interface not found');
  }
  
  if (!content.includes('PermissionDefinition')) {
    warnings.push('Permission definition interface not found');
  }
}

// Check build output
console.log('🏗️ Checking build output...');

const distDir = path.join(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) {
  warnings.push('Dist directory does not exist. Run "npm run build" first.');
} else {
  const indexJs = path.join(distDir, 'index.js');
  const indexDts = path.join(distDir, 'index.d.ts');
  
  if (!fs.existsSync(indexJs)) {
    issues.push('Built JavaScript file not found: dist/index.js');
  }
  
  if (!fs.existsSync(indexDts)) {
    issues.push('TypeScript definitions not found: dist/index.d.ts');
  }
}

// Norwegian compliance checks
console.log('🇳🇴 Validating Norwegian compliance features...');

const providersDir = path.join(process.cwd(), 'src/providers');
if (fs.existsSync(providersDir)) {
  const norwegianProviders = ['idporten.ts', 'bankid.ts', 'feide.ts', 'minid.ts'];
  norwegianProviders.forEach(provider => {
    if (!fs.existsSync(path.join(providersDir, provider))) {
      warnings.push(`Norwegian provider not found: ${provider}`);
    }
  });
} else {
  issues.push('Providers directory not found');
}

// Report results
console.log('\n📋 Validation Results:');

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ All validation checks passed!');
  process.exit(0);
}

if (issues.length > 0) {
  console.log('\n❌ Issues found:');
  issues.forEach((issue, index) => {
    console.log(`  ${index + 1}. ${issue}`);
  });
}

if (warnings.length > 0) {
  console.log('\n⚠️ Warnings:');
  warnings.forEach((warning, index) => {
    console.log(`  ${index + 1}. ${warning}`);
  });
}

if (issues.length > 0) {
  console.log('\n❌ Validation failed. Please fix the issues above before publishing.');
  process.exit(1);
} else {
  console.log('\n⚠️ Validation completed with warnings. Review warnings before publishing.');
  process.exit(0);
}