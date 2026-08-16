#!/usr/bin/env node
/**
 * md2html.js — Batch Markdown to HTML converter
 * 
 * Uses queue-lite for concurrent file processing.
 * Real-world dogfooding of queue-lite features.
 * 
 * Usage: node examples/md2html.js
 */

const Queue = require('../src/index');
const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'html');

// Simple markdown to HTML converter
function md2html(md) {
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, '<p>$1</p>');
  
  return '<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"><title>Document</title></head>\n<body>' + html + '</body>\n</html>';
}

// Find all .md files
const mdFiles = fs.readdirSync(DOCS_DIR)
  .filter(f => f.endsWith('.md'))
  .map(f => path.join(DOCS_DIR, f));

console.log('Found ' + mdFiles.length + ' markdown files\n');

// Create queue
const q = new Queue({
  concurrency: 5,
  rateLimit: 10,
  maxRetries: 1,
});

let completed = 0;
let failed = 0;
const startTime = Date.now();
const frictionPoints = [];

q.on('task:complete', function(id, result) {
  completed++;
  console.log('[' + completed + '/' + mdFiles.length + '] ' + result.filename);
});

q.on('task:fail', function(id, err) {
  failed++;
  console.log('FAILED: ' + err.message);
  frictionPoints.push({ type: 'task_failure', error: err.message });
});

q.on('progress', function(done, total) {
  var pct = ((done / total) * 100).toFixed(0);
  process.stdout.write('\rProgress: ' + pct + '% (' + done + '/' + total + ')');
});

q.on('drain', function() {
  var elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n\nResults:');
  console.log('  Converted: ' + completed);
  console.log('  Failed: ' + failed);
  console.log('  Time: ' + elapsed + 's');
  console.log('  Rate: ' + (completed / (elapsed || 1)).toFixed(1) + '/sec');
  
  if (frictionPoints.length > 0) {
    console.log('\nFriction Points:');
    frictionPoints.forEach(function(fp) {
      console.log('  - ' + fp.type + ': ' + fp.error);
    });
  }
  
  console.log('\nQueue Stats:', q.stats());
  process.exit(0);
});

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Process each file
mdFiles.forEach(function(filePath) {
  var filename = path.basename(filePath);
  
  q.push(async function() {
    var md = fs.readFileSync(filePath, 'utf-8');
    var html = md2html(md);
    var outPath = path.join(OUTPUT_DIR, filename.replace('.md', '.html'));
    fs.writeFileSync(outPath, html);
    return { filename: filename, outPath: outPath };
  }, {
    dedupKey: filename,
    priority: filename.startsWith('experiment') ? 5 : 0,
  });
});
