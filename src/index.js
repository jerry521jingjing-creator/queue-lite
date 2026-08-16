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

const EventEmitter = require('events');

class Queue extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.concurrency = opts.concurrency || 3;
    this.timeout = opts.timeout || 30000;
    this.retryDelay = opts.retryDelay || 1000;
    this.maxRetries = opts.maxRetries || 3;
    this.rateLimit = opts.rateLimit || 0; // tasks per second, 0 = unlimited
    this.rateBurst = opts.rateBurst || opts.rateLimit || 0;
    
    this._queue = [];
    this._running = new Set();
    this._paused = false;
    this._stats = { completed: 0, failed: 0, retried: 0, deduplicated: 0, rateLimited: 0 };
    this._totalEnqueued = 0;
    this._dedupKeys = new Set(); // for dedup tracking
    this._rateTokens = this.rateBurst;
    this._rateLastRefill = Date.now();
    
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
    // Input validation
    if (typeof fn !== 'function') {
      throw new TypeError(`push() expected a function, got ${typeof fn}`);
    }
    if (opts.priority != null && typeof opts.priority !== 'number') {
      throw new TypeError(`options.priority expected a number, got ${typeof opts.priority}`);
    }
    if (opts.timeout != null && (typeof opts.timeout !== 'number' || opts.timeout <= 0)) {
      throw new TypeError(`options.timeout must be a positive number, got ${opts.timeout}`);
    }
    
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let _resolve, _reject;
    
    const promise = new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });
    
    // Task deduplication
    if (opts.dedupKey) {
      if (this._dedupKeys.has(opts.dedupKey)) {
        this._stats.deduplicated++;
        _reject(new Error(`Duplicate task: ${opts.dedupKey}`));
        return { taskId, promise, cancel: () => false };
      }
      this._dedupKeys.add(opts.dedupKey);
    }
    
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
      dedupKey: opts.dedupKey || null,
    };
    
    if (this._paused) {
      if (task.dedupKey) this._dedupKeys.delete(task.dedupKey);
      _reject(new Error('Queue is paused'));
      return { taskId, promise, cancel: () => false };
    }
    
    // Rate limiting check
    if (this.rateLimit > 0) {
      this._refillTokens();
      if (this._rateTokens <= 0) {
        if (task.dedupKey) this._dedupKeys.delete(task.dedupKey);
        this._stats.rateLimited++;
        _reject(new Error('Rate limit exceeded'));
        return { taskId, promise, cancel: () => false };
      }
      this._rateTokens--;
    }
    
    // Insert by priority (higher = first)
    const insertIdx = this._queue.findIndex(t => t.priority < task.priority);
    if (insertIdx === -1) {
      this._queue.push(task);
    } else {
      this._queue.splice(insertIdx, 0, task);
    }
    
    this._totalEnqueued++;
    this.emit('task:queued', taskId);
    
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
        if (task.dedupKey) this._dedupKeys.delete(task.dedupKey);
        _reject(new Error('Task cancelled'));
        return true;
      }
      return false;
    };
    
    return { taskId, promise, cancel };
  }

  /**
   * Refill rate limit tokens based on elapsed time
   */
  _refillTokens() {
    if (this.rateLimit <= 0) return;
    const now = Date.now();
    const elapsed = (now - this._rateLastRefill) / 1000;
    this._rateTokens = Math.min(
      this.rateBurst,
      this._rateTokens + elapsed * this.rateLimit
    );
    this._rateLastRefill = now;
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
    if (this.idle) {
      this.emit('drain');
    }
  }

  async _execute(task) {
    this.emit('task:start', task.taskId);
    const timer = setTimeout(() => {
      task.reject(new Error(`Task timed out after ${task.timeout}ms`));
      this._running.delete(task);
      this._stats.failed++;
      if (task.dedupKey) this._dedupKeys.delete(task.dedupKey);
      this.emit('task:fail', task.taskId, new Error(`Task timed out after ${task.timeout}ms`));
      this.emit('progress', this._stats.completed, this._totalEnqueued);
      this._processNext();
    }, task.timeout);

    try {
      const result = await task.fn();
      clearTimeout(timer);
      this._running.delete(task);
      this._stats.completed++;
      if (task.dedupKey) this._dedupKeys.delete(task.dedupKey);
      this.emit('task:complete', task.taskId, result);
      this.emit('progress', this._stats.completed, this._totalEnqueued);
      if (this._onComplete) this._onComplete(result);
      task.resolve(result);
    } catch (err) {
      clearTimeout(timer);
      
      if (task.retries < this.maxRetries) {
        task.retries++;
        this._stats.retried++;
        this.emit('task:retry', task.taskId, task.retries, err);
        
        // Re-enqueue with delay
        setTimeout(() => {
          this._running.delete(task);
          this._queue.unshift(task); // retry at front
          this._processNext();
        }, this.retryDelay * task.retries);
      } else {
        this._running.delete(task);
        this._stats.failed++;
        if (task.dedupKey) this._dedupKeys.delete(task.dedupKey);
        this.emit('task:fail', task.taskId, err);
        this.emit('progress', this._stats.completed, this._totalEnqueued);
        task.reject(err);
        if (this._onError) this._onError(err);
      }
    }
    
    this._processNext();
  }
}

module.exports = Queue;
