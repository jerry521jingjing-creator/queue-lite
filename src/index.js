/**
 * queue-lite — Lightweight task queue
 * 
 * Features:
 * - Concurrency control
 * - Task retry with backoff
 * - Timeout per task
 * - Event callbacks
 * 
 * Known issue: tasks silently fail when queue is paused
 */

class Queue {
  constructor(opts = {}) {
    this.concurrency = opts.concurrency || 3;
    this.timeout = opts.timeout || 30000;
    this.retryDelay = opts.retryDelay || 1000;
    this.maxRetries = opts.maxRetries || 3;
    
    this._queue = [];
    this._running = new Set();
    this._paused = false;
    this._stats = { completed: 0, failed: 0, retried: 0 };
    
    this._onComplete = opts.onComplete || null;
    this._onError = opts.onError || null;
    this._onDrain = opts.onDrain || null;
  }

  /**
   * Add a task to the queue
   * @param {Function} fn - async function to execute
   * @param {Object} opts - { priority, timeout }
   * @returns {Promise} resolves with task result
   */
  push(fn, opts = {}) {
    return new Promise((resolve, reject) => {
      const task = {
        fn,
        priority: opts.priority || 0,
        timeout: opts.timeout || this.timeout,
        retries: 0,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      };
      
      // BUG: silently drops task if queue is paused
      if (this._paused) {
        reject(new Error('Queue is paused'));
        return;
      }
      
      // Insert by priority (higher = first)
      const insertIdx = this._queue.findIndex(t => t.priority < task.priority);
      if (insertIdx === -1) {
        this._queue.push(task);
      } else {
        this._queue.splice(insertIdx, 0, task);
      }
      
      this._processNext();
    });
  }

  /**
   * Pause the queue
   */
  pause() {
    this._paused = true;
  }

  /**
   * Resume the queue
   */
  resume() {
    this._paused = false;
    this._processNext();
  }

  /**
   * Get queue stats
   */
  stats() {
    return {
      ...this._stats,
      pending: this._queue.length,
      running: this._running.size,
      paused: this._paused,
    };
  }

  /**
   * Get pending task count
   */
  get pending() {
    return this._queue.length;
  }

  /**
   * Check if queue is idle (no running or pending tasks)
   */
  get idle() {
    return this._running.size === 0 && this._queue.length === 0;
  }

  // --- Internal ---

  _processNext() {
    if (this._paused) return;
    
    while (this._running.size < this.concurrency && this._queue.length > 0) {
      const task = this._queue.shift();
      this._running.add(task);
      this._execute(task);
    }
    
    if (this.idle && this._onDrain) {
      this._onDrain();
    }
  }

  async _execute(task) {
    const timer = setTimeout(() => {
      task.reject(new Error(`Task timed out after ${task.timeout}ms`));
      this._running.delete(task);
      this._stats.failed++;
      this._processNext();
    }, task.timeout);

    try {
      const result = await task.fn();
      clearTimeout(timer);
      this._running.delete(task);
      this._stats.completed++;
      task.resolve(result);
      if (this._onComplete) this._onComplete(result);
    } catch (err) {
      clearTimeout(timer);
      
      if (task.retries < this.maxRetries) {
        task.retries++;
        this._stats.retried++;
        
        // Re-enqueue with delay
        setTimeout(() => {
          this._running.delete(task);
          this._queue.unshift(task); // retry at front
          this._processNext();
        }, this.retryDelay * task.retries);
      } else {
        this._running.delete(task);
        this._stats.failed++;
        task.reject(err);
        if (this._onError) this._onError(err);
      }
    }
    
    this._processNext();
  }
}

module.exports = Queue;
