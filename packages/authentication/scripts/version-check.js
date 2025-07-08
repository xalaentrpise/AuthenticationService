#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

async function checkVersion() {
  console.log('Checking version information...');
  
  const currentVersion = packageJson.version;
  const packageName = packageJson.name;
  
  console.log(`Current version: ${currentVersion}`);
  console.log(`Package name: ${packageName}`);
  
  try {
    // Check if version exists on npm
    const npmVersion = execSync(`npm view ${packageName} version`, { encoding: 'utf8' }).trim();
    console.log(`Published version: ${npmVersion}`);
    
    if (currentVersion === npmVersion) {
      console.warn('⚠️  Version matches published version - you may need to bump the version');
      process.exit(1);
    } else {
      console.log('✅ Version is different from published version');
    }
    
    // Check version format
    const versionRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
    if (!versionRegex.test(currentVersion)) {
      console.error('❌ Invalid version format');
      process.exit(1);
    }
    
    // Check git tag
    try {
      const gitTag = execSync(`git tag -l "v${currentVersion}"`, { encoding: 'utf8' }).trim();
      if (gitTag) {
        console.warn(`⚠️  Git tag v${currentVersion} already exists`);
      } else {
        console.log('✅ Git tag does not exist yet');
      }
    } catch (error) {
      console.log('✅ Git tag does not exist yet');
    }
    
    console.log('✅ Version check passed');
    
  } catch (error) {
    if (error.message.includes('npm ERR! code E404')) {
      console.log('✅ Package not yet published - first release');
    } else {
      console.error('❌ Error checking version:', error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  checkVersion().catch(console.error);
}

module.exports = { checkVersion };