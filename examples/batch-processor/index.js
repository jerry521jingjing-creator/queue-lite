/**
 * Batch Processor Example
 * 
 * Demonstrates processing a large batch of items with concurrency control.
 * Useful for file processing, data migration, bulk operations.
 */

const Queue = require('../../src/index');
const fs = require('fs');
const path = require('path');

const BATCH_SIZE = 100;
const CONCURRENCY = 10;

const q = new Queue({
  concurrency: CONCURRENCY,
  maxRetries: 2,
  timeout: 30000,
});

// Progress tracking
let processed = 0;
let errors = 0;
const startTime = Date.now();

q.on('progress', (done, total) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const rate = (done / (Date.now() - startTime) * 1000).toFixed(1);
  process.stdout.write(`\r⏳ ${done}/${total} (${rate}/sec) ${elapsed}s`);
});

q.on('task:fail', (id, err) => {
  errors++;
  console.error(`\n❌ Task ${id}: ${err.message}`);
});

q.on('drain', () => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n\n✅ Batch complete!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Time: ${elapsed}s`);
  console.log(`   Rate: ${(processed / (elapsed || 1)).toFixed(1)}/sec`);
});

// Simulate processing items
function processItem(item) {
  return new Promise((resolve, reject) => {
    // Simulate work
    setTimeout(() => {
      if (Math.random() < 0.05) {
        reject(new Error(`Failed to process item ${item.id}`));
      } else {
        processed++;
        resolve({ id: item.id, status: 'processed' });
      }
    }, Math.random() * 100);
  });
}

// Generate sample data
const items = Array.from({ length: BATCH_SIZE }, (_, i) => ({
  id: i + 1,
  data: `item-${i + 1}`,
}));

console.log(`📦 Processing ${BATCH_SIZE} items (concurrency: ${CONCURRENCY})...\n`);

// Push all items
items.forEach(item => {
  q.push(() => processItem(item), {
    dedupKey: `item-${item.id}`,
  });
});

await q.drainAll();
