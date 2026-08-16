#!/usr/bin/env node
/**
 * file-watcher-cli.js — Watch directory and process changed files
 * 
 * Real-world use of queue-lite:
 * - Watches a directory for file changes
 * - Processes changed files concurrently
 * - Rate limits to avoid overwhelming the system
 * - Deduplicates rapid changes to same file
 * - Reports progress and stats
 * 
 * Usage: node examples/file-watcher-cli.js <directory>
 */

const Queue = require('../src/index');
const fs = require('fs');
const path = require('path');

const WATCH_DIR = process.argv[2] || path.join(__dirname, '..', 'docs');
const POLL_INTERVAL = 1000; // ms

console.log('=== queue-lite File Watcher ===');
console.log('Watching:', WATCH_DIR);
console.log('Poll interval:', POLL_INTERVAL + 'ms\n');

// Track file states
const fileStates = new Map();
const processCount = { success: 0, error: 0 };

// Initialize file states
function initFiles() {
  const files = fs.readdirSync(WATCH_DIR).filter(f => !f.startsWith('.'));
  files.forEach(f => {
    const fp = path.join(WATCH_DIR, f);
    try {
      const stat = fs.statSync(fp);
      fileStates.set(fp, { mtime: stat.mtimeMs, size: stat.size });
    } catch {}
  });
  return files.length;
}

// Create queue
const q = new Queue({
  concurrency: 3,
  rateLimit: 5,
  rateBurst: 3,
  maxRetries: 1,
  timeout: 10000,
});

// Process a file change
async function processFile(filePath, eventType) {
  const filename = path.basename(filePath);
  
  // Simulate real processing work
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').length;
  const bytes = Buffer.byteLength(content);
  
  // Simulate processing time based on file size
  await new Promise(r => setTimeout(r, Math.min(bytes / 1000, 100)));
  
  return {
    filename,
    eventType,
    lines,
    bytes,
    processedAt: new Date().toISOString(),
  };
}

// Event handlers
q.on('task:complete', (id, result) => {
  processCount.success++;
  console.log(`  [${result.eventType}] ${result.filename} (${result.lines} lines, ${result.bytes} bytes)`);
});

q.on('task:fail', (id, err) => {
  processCount.error++;
  console.log(`  [ERROR] ${err.message}`);
});

q.on('drain', () => {
  // Don't exit — keep watching
});

// Poll for changes
let pollCount = 0;
let totalProcessed = 0;

function poll() {
  pollCount++;
  const files = fs.readdirSync(WATCH_DIR).filter(f => !f.startsWith('.'));
  
  files.forEach(f => {
    const fp = path.join(WATCH_DIR, f);
    try {
      const stat = fs.statSync(fp);
      const prev = fileStates.get(fp);
      
      if (!prev) {
        // New file
        q.push(() => processFile(fp, 'created'), { dedupKey: fp }).promise.catch(() => {});
        fileStates.set(fp, { mtime: stat.mtimeMs, size: stat.size });
      } else if (stat.mtimeMs !== prev.mtime || stat.size !== prev.size) {
        // Modified file
        q.push(() => processFile(fp, 'modified'), { dedupKey: fp }).promise.catch(() => {});
        fileStates.set(fp, { mtime: stat.mtimeMs, size: stat.size });
      }
    } catch {}
  });
  
  // Check for deleted files
  for (const [fp] of fileStates) {
    if (!fs.existsSync(fp)) {
      q.push(() => processFile(fp, 'deleted').catch(() => ({ filename: path.basename(fp), eventType: 'deleted' })), { dedupKey: fp }).promise.catch(() => {});
      fileStates.delete(fp);
    }
  }
  
  totalProcessed = processCount.success + processCount.error;
  
  // Print stats every 10 polls
  if (pollCount % 10 === 0) {
    const stats = q.stats();
    console.log(`\n--- Poll #${pollCount} ---`);
    console.log(`  Files tracked: ${fileStates.size}`);
    console.log(`  Processed: ${totalProcessed} (ok: ${processCount.success}, err: ${processCount.error})`);
    console.log(`  Queue: pending=${stats.pending} running=${stats.running}`);
    console.log(`  Rate limited: ${stats.rateLimited}`);
    console.log('');
  }
}

// Start
const initialCount = initFiles();
console.log(`Found ${initialCount} files to track\n`);

// Process initial files
const initialFiles = fs.readdirSync(WATCH_DIR).filter(f => !f.startsWith('.'));
initialFiles.forEach(f => {
  const fp = path.join(WATCH_DIR, f);
  q.push(() => processFile(fp, 'initial'), { dedupKey: fp }).promise.catch(() => {});
});

// Start polling
const pollTimer = setInterval(poll, POLL_INTERVAL);

// Graceful shutdown
process.on('SIGINT', () => {
  clearInterval(pollTimer);
  console.log('\n\nShutting down...');
  console.log('Final stats:', q.stats());
  console.log('Total processed:', totalProcessed);
  process.exit(0);
});

console.log('Watching for changes... (Ctrl+C to stop)\n');
