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
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let _resolve, _reject;
    
    const promise = new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });
    
    const task = {
      taskId,
      fn,
      priority: opts.priority || 0,
      timeout: opts.timeout || this.timeout,
      retries: 0,
      resolve: _resolve,
      reject: _reject,
      enqueuedAt: Date.now(),
      cancelled: false,
    };
    
    if (this._paused) {
      _reject(new Error('Queue is paused'));
      return { taskId, promise, cancel: () => false };
    }
    
    // Insert by priority (higher = first)
    const insertIdx = this._queue.findIndex(t => t.priority < task.priority);
    if (insertIdx === -1) {
      this._queue.push(task);
    } else {
      this._queue.splice(insertIdx, 0, task);
    }
    
    // Defer processing to allow batch enqueue in same tick
    if (!this._processScheduled) {
      this._processScheduled = true;
      Promise.resolve().then(() => {
        this._processScheduled = false;
        this._processNext();
      });
    }
    
    const cancel = () => {
      if (task.cancelled) return false;
      const idx = this._queue.indexOf(task);
      if (idx !== -1) {
        this._queue.splice(idx, 1);
        task.cancelled = true;
        _reject(new Error('Task cancelled'));
        return true;
      }
      return false;
    };
    
    return { taskId, promise, cancel };
  }

  /**
   * Pause the queue
   */
  pause() {
    this._paused = true;
    this._processScheduled = false;
  }

  /**
   * Resume the queue
   */
  resume() {
    this._paused = false;
    // Cancel any pending deferred processing and restart fresh
    this._processScheduled = false;
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
   * Wait for all tasks to complete
   * @returns {Promise} resolves when queue is empty and no tasks running
   */
  drainAll() {
    if (this.idle) return Promise.resolve();
    return new Promise(resolve => {
      const origDrain = this._onDrain;
      this._onDrain = () => {
        if (origDrain) origDrain();
        resolve();
      };
    });
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
