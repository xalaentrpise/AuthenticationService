#!/usr/bin/env node

const cluster = require('cluster');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Stress test configuration
const STRESS_TEST_CONFIG = {
  maxConcurrentUsers: 1000,
  testDuration: 300000, // 5 minutes
  rampUpTime: 60000,    // 1 minute
  memoryLimitMB: 512,
  cpuLimitPercent: 80
};

async function runStressTest() {
  console.log('Starting stress test...');
  console.log(`Configuration: ${JSON.stringify(STRESS_TEST_CONFIG, null, 2)}`);
  
  if (cluster.isMaster) {
    return runMasterProcess();
  } else {
    return runWorkerProcess();
  }
}

async function runMasterProcess() {
  const results = {
    startTime: Date.now(),
    endTime: null,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    maxMemoryUsage: 0,
    maxCpuUsage: 0,
    errors: []
  };
  
  const workers = [];
  const workerCount = Math.min(require('os').cpus().length, 4);
  
  console.log(`Starting ${workerCount} worker processes...`);
  
  // Start workers
  for (let i = 0; i < workerCount; i++) {
    const worker = cluster.fork();
    workers.push(worker);
    
    worker.on('message', (msg) => {
      if (msg.type === 'stats') {
        results.totalRequests += msg.data.requests;
        results.successfulRequests += msg.data.successful;
        results.failedRequests += msg.data.failed;
        results.maxMemoryUsage = Math.max(results.maxMemoryUsage, msg.data.memory);
        results.maxCpuUsage = Math.max(results.maxCpuUsage, msg.data.cpu);
      }
      
      if (msg.type === 'error') {
        results.errors.push(msg.data);
      }
    });
  }
  
  // Monitor system resources
  const resourceMonitor = setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    
    if (memoryUsageMB > STRESS_TEST_CONFIG.memoryLimitMB) {
      console.warn(`Memory usage exceeded limit: ${memoryUsageMB.toFixed(2)}MB`);
    }
    
    results.maxMemoryUsage = Math.max(results.maxMemoryUsage, memoryUsageMB);
  }, 1000);
  
  // Run test for configured duration
  await new Promise(resolve => setTimeout(resolve, STRESS_TEST_CONFIG.testDuration));
  
  // Stop workers
  workers.forEach(worker => worker.kill());
  clearInterval(resourceMonitor);
  
  results.endTime = Date.now();
  results.duration = results.endTime - results.startTime;
  results.requestsPerSecond = results.totalRequests / (results.duration / 1000);
  
  // Generate report
  generateStressTestReport(results);
  
  return results;
}

async function runWorkerProcess() {
  const stats = {
    requests: 0,
    successful: 0,
    failed: 0,
    memory: 0,
    cpu: 0
  };
  
  const startTime = Date.now();
  const endTime = startTime + STRESS_TEST_CONFIG.testDuration;
  
  // Simulate high load
  while (Date.now() < endTime) {
    try {
      await simulateAuthenticationLoad();
      stats.requests++;
      stats.successful++;
    } catch (error) {
      stats.requests++;
      stats.failed++;
      process.send({ type: 'error', data: error.message });
    }
    
    // Monitor memory usage
    const memoryUsage = process.memoryUsage();
    stats.memory = memoryUsage.heapUsed / 1024 / 1024;
    
    // Send stats periodically
    if (stats.requests % 100 === 0) {
      process.send({ type: 'stats', data: stats });
    }
  }
  
  process.send({ type: 'stats', data: stats });
  process.exit(0);
}

async function simulateAuthenticationLoad() {
  // Simulate JWT token generation
  const payload = {
    userId: Math.random().toString(36).substr(2, 9),
    email: `user${Math.random().toString(36).substr(2, 5)}@example.com`,
    roles: ['user'],
    timestamp: Date.now()
  };
  
  // Simulate CPU-intensive operations
  for (let i = 0; i < 1000; i++) {
    JSON.stringify(payload);
    JSON.parse(JSON.stringify(payload));
  }
  
  // Simulate memory allocation
  const largeObject = new Array(1000).fill(payload);
  
  // Simulate async operations
  await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
  
  return { token: 'mock-token', payload };
}

function generateStressTestReport(results) {
  const report = {
    summary: {
      duration: `${(results.duration / 1000).toFixed(2)}s`,
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      successRate: `${(results.successfulRequests / results.totalRequests * 100).toFixed(2)}%`,
      requestsPerSecond: results.requestsPerSecond.toFixed(2),
      maxMemoryUsage: `${results.maxMemoryUsage.toFixed(2)}MB`,
      maxCpuUsage: `${results.maxCpuUsage.toFixed(2)}%`
    },
    thresholds: {
      memoryLimit: `${STRESS_TEST_CONFIG.memoryLimitMB}MB`,
      cpuLimit: `${STRESS_TEST_CONFIG.cpuLimitPercent}%`,
      minSuccessRate: '95%'
    },
    status: {
      memoryWithinLimits: results.maxMemoryUsage <= STRESS_TEST_CONFIG.memoryLimitMB,
      cpuWithinLimits: results.maxCpuUsage <= STRESS_TEST_CONFIG.cpuLimitPercent,
      successRateAcceptable: (results.successfulRequests / results.totalRequests) >= 0.95
    },
    errors: results.errors.slice(0, 10) // Show first 10 errors
  };
  
  console.log('\nStress Test Report:');
  console.log('===================');
  console.log(JSON.stringify(report, null, 2));
  
  // Save report to file
  const reportsDir = path.join(__dirname, '..', 'performance-results');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportFile = path.join(reportsDir, 'stress-test-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`\nReport saved to: ${reportFile}`);
  
  // Exit with error if thresholds are exceeded
  if (!report.status.memoryWithinLimits || 
      !report.status.cpuWithinLimits || 
      !report.status.successRateAcceptable) {
    console.error('Stress test failed - thresholds exceeded');
    process.exit(1);
  }
  
  console.log('Stress test passed all thresholds');
}

if (require.main === module) {
  runStressTest().catch(console.error);
}

module.exports = { runStressTest };