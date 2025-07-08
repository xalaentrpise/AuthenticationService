#!/usr/bin/env node

const http = require('http');
const { performance } = require('perf_hooks');

// k6 load test script - this would typically be run with k6
const loadTestScript = `
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be below 1%
  },
};

export default function() {
  // Test authentication endpoint
  let response = http.post('http://localhost:3000/auth/login', {
    email: 'test@example.com',
    password: 'testpassword'
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  // Test token validation
  if (response.status === 200) {
    let token = response.json().token;
    let validateResponse = http.get('http://localhost:3000/auth/validate', {
      headers: { Authorization: \`Bearer \${token}\` }
    });
    
    check(validateResponse, {
      'validation status is 200': (r) => r.status === 200,
      'validation time < 200ms': (r) => r.timings.duration < 200,
    });
  }
  
  sleep(1);
}
`;

// Simple Node.js load test implementation
async function runLoadTest() {
  console.log('Starting load test...');
  
  const baseUrl = 'http://localhost:3000';
  const concurrentUsers = 50;
  const testDuration = 60000; // 1 minute
  
  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    responseTimes: []
  };
  
  const startTime = Date.now();
  
  // Create promise pool for concurrent requests
  const requests = [];
  
  for (let i = 0; i < concurrentUsers; i++) {
    requests.push(simulateUser(baseUrl, testDuration, results));
  }
  
  await Promise.all(requests);
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  // Calculate statistics
  results.averageResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
  results.requestsPerSecond = results.totalRequests / (totalTime / 1000);
  
  console.log('Load test completed!');
  console.log('Results:');
  console.log(`  Total requests: ${results.totalRequests}`);
  console.log(`  Successful requests: ${results.successfulRequests}`);
  console.log(`  Failed requests: ${results.failedRequests}`);
  console.log(`  Average response time: ${results.averageResponseTime.toFixed(2)}ms`);
  console.log(`  Requests per second: ${results.requestsPerSecond.toFixed(2)}`);
  console.log(`  Success rate: ${(results.successfulRequests / results.totalRequests * 100).toFixed(2)}%`);
  
  return results;
}

async function simulateUser(baseUrl, duration, results) {
  const endTime = Date.now() + duration;
  
  while (Date.now() < endTime) {
    try {
      const start = performance.now();
      
      // Simulate login request
      const response = await makeRequest('POST', `${baseUrl}/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword'
      });
      
      const end = performance.now();
      const responseTime = end - start;
      
      results.totalRequests++;
      results.responseTimes.push(responseTime);
      
      if (response.statusCode === 200) {
        results.successfulRequests++;
      } else {
        results.failedRequests++;
      }
      
      // Wait before next request
      await sleep(Math.random() * 1000);
      
    } catch (error) {
      results.totalRequests++;
      results.failedRequests++;
    }
  }
}

function makeRequest(method, url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: responseData
        });
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (require.main === module) {
  runLoadTest().catch(console.error);
}

module.exports = { runLoadTest };