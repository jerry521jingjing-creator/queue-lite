import { EventEmitter } from 'events';

export interface QueueOptions {
  concurrency?: number;
  timeout?: number;
  retryDelay?: number;
  maxRetries?: number;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  onDrain?: () => void;
}

export interface PushOptions {
  priority?: number;
  timeout?: number;
  dedupKey?: string;
}

export interface TaskResult<T = any> {
  taskId: string;
  promise: Promise<T>;
  cancel: () => boolean;
}

export interface QueueStats {
  completed: number;
  failed: number;
  retried: number;
  deduplicated: number;
  rateLimited: number;
  pending: number;
  running: number;
  paused: boolean;
}

export interface QueueEvents {
  on(event: 'task:queued', listener: (taskId: string) => void): this;
  on(event: 'task:start', listener: (taskId: string) => void): this;
  on(event: 'task:complete', listener: (taskId: string, result: any) => void): this;
  on(event: 'task:fail', listener: (taskId: string, error: Error) => void): this;
  on(event: 'task:retry', listener: (taskId: string, attempt: number, error: Error) => void): this;
  on(event: 'progress', listener: (completed: number, total: number) => void): this;
  on(event: 'drain', listener: () => void): this;
}

export default class Queue extends EventEmitter {
  constructor(opts?: QueueOptions);
  
  readonly concurrency: number;
  readonly timeout: number;
  readonly retryDelay: number;
  readonly maxRetries: number;
  readonly rateLimit: number;
  readonly rateBurst: number;
  readonly pending: number;
  readonly idle: boolean;
  
  push<T = any>(fn: () => Promise<T> | T, opts?: PushOptions): TaskResult<T>;
  pause(): void;
  resume(): void;
  drainAll(): Promise<void>;
  stats(): QueueStats;
  resetStats(): void;
}
