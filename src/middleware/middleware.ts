import { BelurHttpError, BelurServerError } from '../errors/errors.js'

// ─── Options ─────────────────────────────────────────────────────────────────

export interface MiddlewareOptions {
  /** Max retry attempts on 5xx / network errors. Default: 3 */
  retries?: number
  /** Base delay in ms between retries (exponential backoff). Default: 500 */
  retryDelay?: number
  /** Request timeout in ms. Default: 10000 */
  timeout?: number
  /** Max requests per second (refill rate). Default: 10 */
  requestsPerSecond?: number
  /** Max accumulated tokens (burst capacity). Default: requestsPerSecond */
  burstSize?: number
  /** Max queued requests waiting for a token. Default: 50 */
  maxQueueSize?: number
}

const DEFAULTS = {
  retries: 3,
  retryDelay: 500,
  timeout: 10_000,
  requestsPerSecond: 10,
  maxQueueSize: 50,
} as const satisfies Required<Omit<MiddlewareOptions, 'burstSize'>>

// ─── Rate Limiter ────────────────────────────────────────────────────────────

class RateLimiter {
  private readonly queue: Array<{ resolve: () => void; reject: (err: Error) => void }> = []
  private tokens: number
  private readonly maxTokens: number
  private readonly burstSize: number
  private readonly maxQueueSize: number
  private lastRefill: number
  private flushing = false

  constructor(requestsPerSecond: number, burstSize: number, maxQueueSize: number) {
    this.maxTokens = requestsPerSecond
    this.burstSize = burstSize
    this.maxQueueSize = maxQueueSize
    this.tokens = burstSize
    this.lastRefill = Date.now()

    setInterval(() => this.refill(), 1000 / requestsPerSecond).unref()
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.burstSize, this.tokens + elapsed * this.maxTokens)
    this.lastRefill = now
    this.flush()
  }

  private flush(): void {
    if (this.flushing) return
    this.flushing = true

    while (this.tokens >= 1 && this.queue.length > 0) {
      const next = this.queue.shift()
      if (next !== undefined) {
        this.tokens--
        next.resolve()
      }
    }

    this.flushing = false
  }

  acquire(): Promise<void> {
    if (this.tokens >= 1) {
      this.tokens--
      return Promise.resolve()
    }

    if (this.queue.length >= this.maxQueueSize) {
      return Promise.reject(
        new Error(`Rate limiter queue is full (max ${this.maxQueueSize} requests)`)
      )
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject })
    })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRetryable(err: unknown): boolean {
  if (err instanceof BelurHttpError) {
    return err.statusCode >= 500
  }
  // Network errors (fetch failed, ECONNRESET, etc.)
  if (err instanceof TypeError) return true
  return false
}

function calcDelay(attempt: number, baseDelay: number): number {
  const exponential = baseDelay * 2 ** attempt
  const jitter = Math.random() * baseDelay
  return exponential + jitter
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export class Middleware {
  private readonly retries: number
  private readonly retryDelay: number
  private readonly timeout: number
  private readonly rateLimiter: RateLimiter

  constructor(options: MiddlewareOptions = {}) {
    this.retries = options.retries ?? DEFAULTS.retries
    this.retryDelay = options.retryDelay ?? DEFAULTS.retryDelay
    this.timeout = options.timeout ?? DEFAULTS.timeout

    const rps = options.requestsPerSecond ?? DEFAULTS.requestsPerSecond
    const burst = options.burstSize ?? rps
    const maxQueueSize = options.maxQueueSize ?? DEFAULTS.maxQueueSize

    this.rateLimiter = new RateLimiter(rps, burst, maxQueueSize)
  }

  async execute(url: string, init: RequestInit): Promise<Response> {
    await this.rateLimiter.acquire()

    let lastError: unknown

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeout)

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        })

        if (response.status >= 500) {
          const raw = await response.json().catch(() => null)
          throw new BelurServerError(raw)
        }

        return response
      } catch (err) {
        lastError = err

        if (!isRetryable(err) || attempt === this.retries) break

        await sleep(calcDelay(attempt, this.retryDelay))
      } finally {
        clearTimeout(timer)
      }
    }

    throw lastError
  }
}