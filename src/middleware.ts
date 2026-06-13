import { BelurHttpError, BelurServerError } from './errors.js'

// ─── Options ─────────────────────────────────────────────────────────────────

export interface MiddlewareOptions {
  /** Max retry attempts on 5xx / network errors. Default: 3 */
  retries?: number
  /** Base delay in ms between retries (exponential backoff). Default: 500 */
  retryDelay?: number
  /** Request timeout in ms. Default: 10000 */
  timeout?: number
  /** Max requests per second. Default: 5 */
  requestsPerSecond?: number
  /** Burst capacity (max accumulated tokens). Default: requestsPerSecond */
  burstSize?: number
}

const DEFAULTS = {
  retries:           3,
  retryDelay:        500,
  timeout:           10_000,
  requestsPerSecond: 5,
} as const satisfies Required<Omit<MiddlewareOptions, 'burstSize'>>

// ─── Token Bucket ─────────────────────────────────────────────────────────────

class TokenBucket {
  private tokens:     number
  private lastRefill: number

  constructor(
    private readonly capacity:     number,
    private readonly refillPerSec: number,
  ) {
    this.tokens     = capacity
    this.lastRefill = Date.now()
  }

  async consume(): Promise<void> {
    this.refill()

    while (this.tokens <= 0) {
      await sleep(100)
      this.refill()
    }

    this.tokens--
  }

  private refill(): void {
    const now   = Date.now()
    const delta = (now - this.lastRefill) / 1000
    const add   = delta * this.refillPerSec
    const whole = Math.floor(add)

    if (whole >= 1) {
      this.tokens = Math.min(this.capacity, this.tokens + whole)
    }

    this.lastRefill = now - ((add - whole) / this.refillPerSec) * 1000
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRetryable(err: unknown): boolean {
  if (err instanceof BelurHttpError) return err.statusCode >= 500
  if (err instanceof TypeError)      return true
  return false
}

function calcDelay(attempt: number, baseDelay: number): number {
  const exponential = baseDelay * 2 ** attempt
  const jitter      = Math.random() * baseDelay
  return exponential + jitter
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export class Middleware {
  private readonly retries:     number
  private readonly retryDelay:  number
  private readonly timeout:     number
  private readonly bucket:      TokenBucket

  constructor(options: MiddlewareOptions = {}) {
    this.retries    = options.retries    ?? DEFAULTS.retries
    this.retryDelay = options.retryDelay ?? DEFAULTS.retryDelay
    this.timeout    = options.timeout    ?? DEFAULTS.timeout

    const rps   = options.requestsPerSecond ?? DEFAULTS.requestsPerSecond
    const burst = options.burstSize         ?? rps

    this.bucket = new TokenBucket(burst, rps)
  }

  async execute(url: string, init: RequestInit): Promise<Response> {
    await this.bucket.consume()

    let lastError: unknown

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController()
      const timer      = setTimeout(() => controller.abort(), this.timeout)

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        })

        if (response.status >= 500) {
          const raw = await response.json().catch(() => null)
          throw new BelurServerError(response.status, raw)
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