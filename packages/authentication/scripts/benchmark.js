#!/usr/bin/env node

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Mock authentication providers for benchmarking
const providers = {
  jwt: () => Promise.resolve({ token: 'mock-jwt-token' }),
  oauth: () => Promise.resolve({ token: 'mock-oauth-token' }),
  passwordless: () => Promise.resolve({ token: 'mock-passwordless-token' })
};

async function benchmarkFunction(name, fn, iterations = 1000) {
  console.log(`Running benchmark: ${name}`);
  
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
  
  return {
    name,
    iterations,
    avg: parseFloat(avg.toFixed(3)),
    min: parseFloat(min.toFixed(3)),
    max: parseFloat(max.toFixed(3)),
    p95: parseFloat(p95.toFixed(3))
  };
}

async function runBenchmarks() {
  console.log('Starting performance benchmarks...\n');
  
  const results = [];
  
  // JWT token generation benchmark
  results.push(await benchmarkFunction(
    'JWT Token Generation',
    async () => {
      return providers.jwt();
    },
    5000
  ));
  
  // OAuth flow benchmark
  results.push(await benchmarkFunction(
    'OAuth Authentication',
    async () => {
      return providers.oauth();
    },
    1000
  ));
  
  // Passwordless flow benchmark
  results.push(await benchmarkFunction(
    'Passwordless Authentication',
    async () => {
      return providers.passwordless();
    },
    1000
  ));
  
  // Memory usage benchmark
  const memoryBefore = process.memoryUsage();
  const largeArray = new Array(100000).fill('test-data');
  const memoryAfter = process.memoryUsage();
  
  results.push({
    name: 'Memory Usage',
    heapUsed: (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024,
    heapTotal: (memoryAfter.heapTotal - memoryBefore.heapTotal) / 1024 / 1024,
    external: (memoryAfter.external - memoryBefore.external) / 1024 / 1024
  });
  
  // Display results
  console.log('\nBenchmark Results:');
  console.log('==================');
  
  results.forEach(result => {
    if (result.name === 'Memory Usage') {
      console.log(`${result.name}:`);
      console.log(`  Heap Used: ${result.heapUsed.toFixed(2)} MB`);
      console.log(`  Heap Total: ${result.heapTotal.toFixed(2)} MB`);
      console.log(`  External: ${result.external.toFixed(2)} MB`);
    } else {
      console.log(`${result.name}:`);
      console.log(`  Iterations: ${result.iterations}`);
      console.log(`  Average: ${result.avg}ms`);
      console.log(`  Min: ${result.min}ms`);
      console.log(`  Max: ${result.max}ms`);
      console.log(`  95th percentile: ${result.p95}ms`);
    }
    console.log();
  });
  
  // Save results to file
  const resultsDir = path.join(__dirname, '..', 'performance-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const resultsFile = path.join(resultsDir, 'benchmark-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  // Create summary for CI
  const summary = {
    bundleSize: 450000, // Mock value - would be calculated from actual build
    memoryUsage: results.find(r => r.name === 'Memory Usage')?.heapUsed || 0,
    authSpeed: results.find(r => r.name === 'JWT Token Generation')?.avg || 0,
    tokenGeneration: results.find(r => r.name === 'OAuth Authentication')?.avg || 0
  };
  
  const summaryFile = path.join(resultsDir, 'summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log('Benchmark results saved to:', resultsFile);
  console.log('Summary saved to:', summaryFile);
}

if (require.main === module) {
  runBenchmarks().catch(console.error);
}

module.exports = { runBenchmarks, benchmarkFunction };