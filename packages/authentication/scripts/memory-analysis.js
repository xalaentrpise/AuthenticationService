#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Memory analysis configuration
const ANALYSIS_CONFIG = {
  iterations: 1000,
  gcThreshold: 50, // MB
  leakThreshold: 10, // MB increase per iteration
  monitoringDuration: 60000 // 1 minute
};

async function runMemoryAnalysis() {
  console.log('Starting memory analysis...');
  console.log(`Configuration: ${JSON.stringify(ANALYSIS_CONFIG, null, 2)}`);
  
  const results = {
    initialMemory: process.memoryUsage(),
    finalMemory: null,
    memorySnapshots: [],
    leakDetected: false,
    gcEfficiency: 0,
    recommendations: []
  };
  
  // Initial memory snapshot
  results.memorySnapshots.push({
    timestamp: Date.now(),
    memory: process.memoryUsage(),
    iteration: 0
  });
  
  console.log('Running memory stress test...');
  
  // Run memory-intensive operations
  for (let i = 0; i < ANALYSIS_CONFIG.iterations; i++) {
    await performMemoryIntensiveOperation();
    
    // Take memory snapshot every 100 iterations
    if (i % 100 === 0) {
      const currentMemory = process.memoryUsage();
      results.memorySnapshots.push({
        timestamp: Date.now(),
        memory: currentMemory,
        iteration: i
      });
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Check for memory leaks
      const memoryIncrease = (currentMemory.heapUsed - results.initialMemory.heapUsed) / 1024 / 1024;
      if (memoryIncrease > ANALYSIS_CONFIG.leakThreshold) {
        console.warn(`Potential memory leak detected at iteration ${i}: ${memoryIncrease.toFixed(2)}MB increase`);
        results.leakDetected = true;
      }
    }
  }
  
  // Final memory snapshot
  results.finalMemory = process.memoryUsage();
  results.memorySnapshots.push({
    timestamp: Date.now(),
    memory: results.finalMemory,
    iteration: ANALYSIS_CONFIG.iterations
  });
  
  // Analyze results
  analyzeMemoryResults(results);
  
  // Generate recommendations
  generateMemoryRecommendations(results);
  
  // Save results
  saveMemoryAnalysisResults(results);
  
  return results;
}

async function performMemoryIntensiveOperation() {
  // Simulate authentication operations that use memory
  const users = [];
  const tokens = [];
  
  // Create temporary objects
  for (let i = 0; i < 100; i++) {
    users.push({
      id: Math.random().toString(36).substr(2, 9),
      email: `user${i}@example.com`,
      roles: ['user', 'authenticated'],
      permissions: ['read', 'write'],
      metadata: {
        lastLogin: new Date(),
        loginCount: Math.floor(Math.random() * 100),
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: true
        }
      }
    });
    
    tokens.push({
      token: 'jwt-token-' + Math.random().toString(36).substr(2, 32),
      userId: users[i].id,
      expiresAt: new Date(Date.now() + 3600000),
      scopes: ['read', 'write'],
      metadata: {
        userAgent: 'Mozilla/5.0 (Test)',
        ipAddress: '192.168.1.1',
        deviceId: 'device-' + Math.random().toString(36).substr(2, 16)
      }
    });
  }
  
  // Simulate processing
  users.forEach(user => {
    JSON.stringify(user);
    JSON.parse(JSON.stringify(user));
  });
  
  tokens.forEach(token => {
    JSON.stringify(token);
    JSON.parse(JSON.stringify(token));
  });
  
  // Simulate async operations
  await new Promise(resolve => setTimeout(resolve, 1));
  
  // Objects should be garbage collected after function ends
}

function analyzeMemoryResults(results) {
  const initialHeap = results.initialMemory.heapUsed / 1024 / 1024;
  const finalHeap = results.finalMemory.heapUsed / 1024 / 1024;
  const heapIncrease = finalHeap - initialHeap;
  
  console.log('\nMemory Analysis Results:');
  console.log('========================');
  console.log(`Initial heap usage: ${initialHeap.toFixed(2)}MB`);
  console.log(`Final heap usage: ${finalHeap.toFixed(2)}MB`);
  console.log(`Heap increase: ${heapIncrease.toFixed(2)}MB`);
  console.log(`Memory leak detected: ${results.leakDetected ? 'YES' : 'NO'}`);
  
  // Calculate memory growth rate
  const snapshots = results.memorySnapshots;
  const growthRates = [];
  
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1].memory.heapUsed / 1024 / 1024;
    const curr = snapshots[i].memory.heapUsed / 1024 / 1024;
    const growth = curr - prev;
    growthRates.push(growth);
  }
  
  const avgGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
  console.log(`Average memory growth rate: ${avgGrowthRate.toFixed(2)}MB per 100 iterations`);
  
  // Analyze memory efficiency
  const totalAllocated = results.finalMemory.heapTotal / 1024 / 1024;
  const totalUsed = results.finalMemory.heapUsed / 1024 / 1024;
  const efficiency = (totalUsed / totalAllocated) * 100;
  
  console.log(`Memory efficiency: ${efficiency.toFixed(2)}%`);
  results.gcEfficiency = efficiency;
}

function generateMemoryRecommendations(results) {
  const recommendations = [];
  
  const finalHeapMB = results.finalMemory.heapUsed / 1024 / 1024;
  const initialHeapMB = results.initialMemory.heapUsed / 1024 / 1024;
  const heapIncrease = finalHeapMB - initialHeapMB;
  
  if (results.leakDetected) {
    recommendations.push({
      type: 'critical',
      message: 'Memory leak detected - review object lifecycle and cleanup',
      action: 'Implement proper cleanup in finally blocks and event listeners'
    });
  }
  
  if (heapIncrease > 5) {
    recommendations.push({
      type: 'warning',
      message: 'Significant memory increase detected',
      action: 'Consider implementing object pooling or reducing object creation'
    });
  }
  
  if (results.gcEfficiency < 70) {
    recommendations.push({
      type: 'optimization',
      message: 'Low garbage collection efficiency',
      action: 'Review long-lived object references and implement weak references where appropriate'
    });
  }
  
  if (results.finalMemory.external > 50 * 1024 * 1024) {
    recommendations.push({
      type: 'warning',
      message: 'High external memory usage',
      action: 'Review native module usage and buffer management'
    });
  }
  
  results.recommendations = recommendations;
  
  console.log('\nRecommendations:');
  console.log('================');
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. [${rec.type.toUpperCase()}] ${rec.message}`);
    console.log(`   Action: ${rec.action}`);
    console.log();
  });
}

function saveMemoryAnalysisResults(results) {
  const reportsDir = path.join(__dirname, '..', 'performance-results');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportFile = path.join(reportsDir, 'memory-analysis-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  
  console.log(`Memory analysis report saved to: ${reportFile}`);
  
  // Create CSV for memory snapshots
  const csvFile = path.join(reportsDir, 'memory-snapshots.csv');
  const csvContent = 'timestamp,iteration,heapUsed,heapTotal,external,rss\n' +
    results.memorySnapshots.map(snapshot => 
      `${snapshot.timestamp},${snapshot.iteration},${snapshot.memory.heapUsed},${snapshot.memory.heapTotal},${snapshot.memory.external},${snapshot.memory.rss}`
    ).join('\n');
  
  fs.writeFileSync(csvFile, csvContent);
  console.log(`Memory snapshots saved to: ${csvFile}`);
}

if (require.main === module) {
  runMemoryAnalysis().catch(console.error);
}

module.exports = { runMemoryAnalysis };