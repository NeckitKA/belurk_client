import { Middleware, type MiddlewareOptions } from './middleware.js'
import {
  BelurAuthError,
  BelurForbiddenError,
  BelurHttpError,
  BelurNotFoundError,
} from './errors.js'
import type {
  CreateOrderRequest,
  ProxyListRequest,
  RenewalStepOneRequest,
  RenewalStepTwoRequest,
} from './schemas.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL = 'https://api.belurk.ru'

// ─── Factory Options ─────────────────────────────────────────────────────────

export interface BelurClientOptions extends MiddlewareOptions {
  apiToken: string
}

// ─── Internal Client ─────────────────────────────────────────────────────────

class BelurClient {
  private readonly apiToken:    string
  private readonly middleware:  Middleware

  constructor({ apiToken, ...middlewareOptions }: BelurClientOptions) {
    this.apiToken   = apiToken
    this.middleware = new Middleware(middlewareOptions)
  }

  // ─── Core ──────────────────────────────────────────────────────────────────

  private static validateOrderId(orderId: number): void {
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new TypeError(`Invalid orderId: must be a positive integer, got ${orderId}`)
    }
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-token':  this.apiToken,
    }
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path:   string,
    body?:  unknown,
  ): Promise<T> {
    const url = `${BASE_URL}${path}`

    const init: RequestInit = {
      method,
      headers: this.headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }

    const response = await this.middleware.execute(url, init)

    if (!response.ok) {
      await this.handleHttpError(response)
    }

    return response.json() as Promise<T>
  }

  private async handleHttpError(response: Response): Promise<never> {
    const raw: unknown = await response.json().catch(() => null)
    const message =
      raw !== null &&
      typeof raw === 'object' &&
      'error' in raw &&
      typeof (raw as Record<string, unknown>)['error'] === 'string'
        ? (raw as Record<string, unknown>)['error'] as string
        : 'Not found'

    switch (response.status) {
      case 401:
        throw new BelurAuthError(raw)
      case 403:
        throw new BelurForbiddenError(raw)
      case 404:
        throw new BelurNotFoundError(message, raw)
      default:
        throw new BelurHttpError(response.status, `HTTP error ${response.status}`, raw)
    }
  }

  // ─── Account ───────────────────────────────────────────────────────────────

  getBalance(): Promise<unknown> {
    return this.request('GET', '/accounts/get-balance')
  }

  // ─── Products ──────────────────────────────────────────────────────────────

  getAvailableProducts(): Promise<unknown> {
    return this.request('GET', '/products/get-all')
  }

  // ─── Orders ────────────────────────────────────────────────────────────────

  createOrder(body: CreateOrderRequest): Promise<unknown> {
    return this.request('POST', '/orders/create', body)
  }

  getOrderStatus(orderId: number): Promise<unknown> {
    BelurClient.validateOrderId(orderId)
    return this.request('GET', `/orders/check-status?order_id=${orderId}`)
  }

  getOrderInfo(orderId: number): Promise<unknown> {
    BelurClient.validateOrderId(orderId)
    return this.request('GET', `/orders/${orderId}`)
  }

  // ─── Proxy ─────────────────────────────────────────────────────────────────

  getProxyList(body: ProxyListRequest): Promise<unknown> {
    return this.request('GET', '/proxy/get-all', body)
  }

  // ─── Renewal ───────────────────────────────────────────────────────────────

  getRenewalOptions(body: RenewalStepOneRequest): Promise<unknown> {
    return this.request('POST', '/proxy/create-renewal', body)
  }

  confirmRenewal(body: RenewalStepTwoRequest): Promise<unknown> {
    return this.request('POST', '/orders/create-renewal', body)
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export type { BelurClient }

export function createBelurClient(options: BelurClientOptions): BelurClient {
  return new BelurClient(options)
}