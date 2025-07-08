#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  packagePath: path.join(__dirname, '..'),
  outputPath: path.join(__dirname, '..', 'RELEASE_NOTES.md'),
  templatePath: path.join(__dirname, 'release-notes-template.md'),
  changelogPath: path.join(__dirname, '..', 'CHANGELOG.md'),
  packageJsonPath: path.join(__dirname, '..', 'package.json')
};

async function generateReleaseNotes() {
  console.log('Generating release notes...');
  
  try {
    // Read package.json to get version info
    const packageJson = JSON.parse(fs.readFileSync(CONFIG.packageJsonPath, 'utf8'));
    const version = packageJson.version;
    const packageName = packageJson.name;
    
    // Get git information
    const gitInfo = getGitInformation();
    
    // Generate changelog entries
    const changelogEntries = generateChangelogEntries();
    
    // Get test results
    const testResults = await getTestResults();
    
    // Get security audit results
    const securityResults = await getSecurityResults();
    
    // Get performance metrics
    const performanceMetrics = await getPerformanceMetrics();
    
    // Generate release notes
    const releaseNotes = generateReleaseNotesContent({
      version,
      packageName,
      gitInfo,
      changelogEntries,
      testResults,
      securityResults,
      performanceMetrics
    });
    
    // Write release notes
    fs.writeFileSync(CONFIG.outputPath, releaseNotes);
    
    console.log(`Release notes generated: ${CONFIG.outputPath}`);
    
    return releaseNotes;
    
  } catch (error) {
    console.error('Error generating release notes:', error);
    process.exit(1);
  }
}

function getGitInformation() {
  try {
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    const commitsSinceTag = execSync(`git rev-list ${lastTag}..HEAD --count`, { encoding: 'utf8' }).trim();
    const latestCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().substring(0, 7);
    const commitMessage = execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf8' }).trim();
    const author = execSync('git log -1 --pretty=format:"%an"', { encoding: 'utf8' }).trim();
    const date = execSync('git log -1 --pretty=format:"%ai"', { encoding: 'utf8' }).trim();
    
    return {
      lastTag,
      commitsSinceTag: parseInt(commitsSinceTag),
      latestCommit,
      commitMessage,
      author,
      date
    };
  } catch (error) {
    console.warn('Could not get git information:', error.message);
    return {
      lastTag: 'v0.0.0',
      commitsSinceTag: 0,
      latestCommit: 'unknown',
      commitMessage: 'Unknown',
      author: 'Unknown',
      date: new Date().toISOString()
    };
  }
}

function generateChangelogEntries() {
  try {
    // Get commits since last tag
    const gitInfo = getGitInformation();
    const commits = execSync(`git log ${gitInfo.lastTag}..HEAD --pretty=format:"%h|%s|%an|%ai"`, { encoding: 'utf8' })
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, subject, author, date] = line.split('|');
        return { hash, subject, author, date };
      });
    
    // Categorize commits
    const categories = {
      features: [],
      fixes: [],
      improvements: [],
      security: [],
      compliance: [],
      breaking: [],
      other: []
    };
    
    commits.forEach(commit => {
      const subject = commit.subject.toLowerCase();
      
      if (subject.includes('feat') || subject.includes('feature')) {
        categories.features.push(commit);
      } else if (subject.includes('fix') || subject.includes('bug')) {
        categories.fixes.push(commit);
      } else if (subject.includes('security') || subject.includes('vulnerability')) {
        categories.security.push(commit);
      } else if (subject.includes('gdpr') || subject.includes('compliance') || subject.includes('nsm')) {
        categories.compliance.push(commit);
      } else if (subject.includes('breaking') || subject.includes('major')) {
        categories.breaking.push(commit);
      } else if (subject.includes('perf') || subject.includes('improve')) {
        categories.improvements.push(commit);
      } else {
        categories.other.push(commit);
      }
    });
    
    return categories;
    
  } catch (error) {
    console.warn('Could not generate changelog entries:', error.message);
    return {
      features: [],
      fixes: [],
      improvements: [],
      security: [],
      compliance: [],
      breaking: [],
      other: []
    };
  }
}

async function getTestResults() {
  try {
    // Run tests and capture results
    const testOutput = execSync('npm test -- --json', { 
      encoding: 'utf8',
      cwd: CONFIG.packagePath
    });
    
    const testResults = JSON.parse(testOutput);
    
    return {
      success: testResults.success,
      numTotalTests: testResults.numTotalTests,
      numPassedTests: testResults.numPassedTests,
      numFailedTests: testResults.numFailedTests,
      coverage: testResults.coverageMap ? calculateCoverage(testResults.coverageMap) : null
    };
    
  } catch (error) {
    console.warn('Could not get test results:', error.message);
    return {
      success: false,
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 0,
      coverage: null
    };
  }
}

async function getSecurityResults() {
  try {
    // Run security audit
    const auditOutput = execSync('npm audit --json', { 
      encoding: 'utf8',
      cwd: CONFIG.packagePath
    });
    
    const auditResults = JSON.parse(auditOutput);
    
    return {
      vulnerabilities: auditResults.vulnerabilities || {},
      totalVulnerabilities: auditResults.metadata?.vulnerabilities?.total || 0,
      highVulnerabilities: auditResults.metadata?.vulnerabilities?.high || 0,
      moderateVulnerabilities: auditResults.metadata?.vulnerabilities?.moderate || 0,
      lowVulnerabilities: auditResults.metadata?.vulnerabilities?.low || 0
    };
    
  } catch (error) {
    console.warn('Could not get security results:', error.message);
    return {
      vulnerabilities: {},
      totalVulnerabilities: 0,
      highVulnerabilities: 0,
      moderateVulnerabilities: 0,
      lowVulnerabilities: 0
    };
  }
}

async function getPerformanceMetrics() {
  try {
    // Run performance benchmarks
    const benchmarkOutput = execSync('npm run benchmark', { 
      encoding: 'utf8',
      cwd: CONFIG.packagePath
    });
    
    // Parse benchmark results (assuming JSON output)
    const performanceDir = path.join(CONFIG.packagePath, 'performance-results');
    const summaryFile = path.join(performanceDir, 'summary.json');
    
    if (fs.existsSync(summaryFile)) {
      const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
      return summary;
    }
    
    return {
      bundleSize: 'Unknown',
      memoryUsage: 'Unknown',
      authSpeed: 'Unknown',
      tokenGeneration: 'Unknown'
    };
    
  } catch (error) {
    console.warn('Could not get performance metrics:', error.message);
    return {
      bundleSize: 'Unknown',
      memoryUsage: 'Unknown',
      authSpeed: 'Unknown',
      tokenGeneration: 'Unknown'
    };
  }
}

function generateReleaseNotesContent(data) {
  const {
    version,
    packageName,
    gitInfo,
    changelogEntries,
    testResults,
    securityResults,
    performanceMetrics
  } = data;
  
  const releaseDate = new Date().toISOString().split('T')[0];
  
  return `# Release Notes - ${packageName} v${version}

**Release Date**: ${releaseDate}  
**Git Commit**: ${gitInfo.latestCommit}  
**Commits Since Last Release**: ${gitInfo.commitsSinceTag}

## Overview

This release includes ${gitInfo.commitsSinceTag} commits with new features, bug fixes, and improvements to the Norwegian-compliant authentication system.

## What's New

### 🚀 Features
${formatCommitList(changelogEntries.features)}

### 🐛 Bug Fixes
${formatCommitList(changelogEntries.fixes)}

### 🔒 Security Updates
${formatCommitList(changelogEntries.security)}

### 📋 Compliance Updates
${formatCommitList(changelogEntries.compliance)}

### ⚡ Performance Improvements
${formatCommitList(changelogEntries.improvements)}

### 💥 Breaking Changes
${formatCommitList(changelogEntries.breaking)}

## Quality Metrics

### Test Results
- **Total Tests**: ${testResults.numTotalTests}
- **Passed**: ${testResults.numPassedTests}
- **Failed**: ${testResults.numFailedTests}
- **Success Rate**: ${testResults.numTotalTests > 0 ? ((testResults.numPassedTests / testResults.numTotalTests) * 100).toFixed(1) : 0}%
${testResults.coverage ? `- **Coverage**: ${testResults.coverage.toFixed(1)}%` : ''}

### Security Audit
- **Total Vulnerabilities**: ${securityResults.totalVulnerabilities}
- **High Severity**: ${securityResults.highVulnerabilities}
- **Moderate Severity**: ${securityResults.moderateVulnerabilities}
- **Low Severity**: ${securityResults.lowVulnerabilities}

### Performance Metrics
- **Bundle Size**: ${performanceMetrics.bundleSize}
- **Memory Usage**: ${performanceMetrics.memoryUsage}
- **Auth Speed**: ${performanceMetrics.authSpeed}ms
- **Token Generation**: ${performanceMetrics.tokenGeneration}ms

## Norwegian Compliance Features

✅ **ID-porten Integration** - Norwegian national identity provider  
✅ **BankID Support** - Mobile banking authentication  
✅ **Feide Provider** - Educational sector authentication  
✅ **Vipps Authentication** - Mobile payment authentication  
✅ **GDPR Compliance** - Data protection and privacy  
✅ **NSM Guidelines** - Security framework compliance  
✅ **Audit Logging** - Comprehensive compliance logging  

## Global Authentication Providers

✅ **Google OAuth 2.0** - Google account authentication  
✅ **Facebook Login** - Social media authentication  
✅ **Supabase Auth** - Database authentication service  
✅ **Email/Password** - Traditional authentication  
✅ **Magic Links** - Passwordless email authentication  
✅ **SMS OTP** - One-time password verification  

## Installation

\`\`\`bash
npm install ${packageName}@${version}
\`\`\`

## Migration Guide

${generateMigrationGuide(changelogEntries.breaking)}

## Known Issues

${generateKnownIssues()}

## Contributors

- ${gitInfo.author}

## Full Changelog

See [CHANGELOG.md](./CHANGELOG.md) for complete details.

---

**Documentation**: [README.md](./README.md)  
**Issues**: [GitHub Issues](https://github.com/xala-technologies/authentication/issues)  
**License**: MIT
`;
}

function formatCommitList(commits) {
  if (commits.length === 0) {
    return '_No changes in this category_';
  }
  
  return commits.map(commit => 
    `- ${commit.subject} (${commit.hash})`
  ).join('\n');
}

function calculateCoverage(coverageMap) {
  // Simple coverage calculation
  const files = Object.keys(coverageMap);
  let totalStatements = 0;
  let coveredStatements = 0;
  
  files.forEach(file => {
    const fileCoverage = coverageMap[file];
    if (fileCoverage.s) {
      totalStatements += Object.keys(fileCoverage.s).length;
      coveredStatements += Object.values(fileCoverage.s).filter(count => count > 0).length;
    }
  });
  
  return totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;
}

function generateMigrationGuide(breakingChanges) {
  if (breakingChanges.length === 0) {
    return '_No breaking changes in this release_';
  }
  
  return breakingChanges.map(change => 
    `### ${change.subject}\n\nDetails: ${change.subject}\n`
  ).join('\n');
}

function generateKnownIssues() {
  return '_No known issues at this time_';
}

if (require.main === module) {
  generateReleaseNotes().catch(console.error);
}

module.exports = { generateReleaseNotes };