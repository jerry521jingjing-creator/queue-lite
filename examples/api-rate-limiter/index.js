/**
 * API Rate Limiter Example
 * 
 * Demonstrates using queue-lite to rate-limit API calls.
 * Useful when calling third-party APIs with rate limits.
 */

const Queue = require('../../src/index');

// Create a rate-limited queue
// 10 requests/second, burst of 5
const apiQueue = new Queue({
  concurrency: 5,
  rateLimit: 10,
  rateBurst: 5,
  maxRetries: 2,
  retryDelay: 2000,
});

// Track metrics
let completed = 0;
let failed = 0;

apiQueue.on('task:complete', (id) => {
  completed++;
  console.log(`✅ [${completed}/${TOTAL}] Task ${id} completed`);
});

apiQueue.on('task:fail', (id, err) => {
  failed++;
  console.log(`❌ Task ${id} failed: ${err.message}`);
});

apiQueue.on('drain', () => {
  console.log(`\n📊 Summary: ${completed} completed, ${failed} failed`);
});

// Simulate API calls
const TOTAL = 20;
const urls = Array.from({ length: TOTAL }, (_, i) => 
  `https://jsonplaceholder.typicode.com/posts/${i + 1}`
);

async function fetchAPI(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Push all URLs to the queue
console.log(`🚀 Queuing ${TOTAL} API calls (10/sec rate limit)...\n`);

urls.forEach((url, i) => {
  apiQueue.push(
    () => fetchAPI(url),
    { dedupKey: url } // prevent duplicate calls
  );
});

// Wait for completion
await apiQueue.drainAll();
