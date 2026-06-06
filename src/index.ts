import { createBelurClient, type BelurClientOptions } from './api/client.js'
import { BelurController } from './controller/controller.js'

// ─── Factory ─────────────────────────────────────────────────────────────────

export interface BelurInstance {
  controller: BelurController
}

export function createBelur(options: BelurClientOptions): BelurInstance {
  const client = createBelurClient(options)
  const controller = new BelurController(client)
  return { controller }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type { BelurClientOptions }
export type { BelurClient } from './api/client.js'
export type { BelurController } from './controller/controller.js'

export type {
  Balance,
  ProductList,
  ProductVariant,
  Product,
  ProxyItem,
  ProxyList,
  ProxyType,
  CreateOrderRequest,
  CreateOrderResult,
  OrderStatus,
  OrderStatusCode,
  OrderInfo,
  OrderType,
  Renewal,
  RenewalPeriod,
  RenewalStepOneRequest,
  RenewalStepTwoRequest,
  CreateRenewalResult,
  ProxyListRequest,
} from './api/schemas.js'

export type { BelurResult, BelurErrorPayload } from './errors/errors.js'

// ─── Errors ──────────────────────────────────────────────────────────────────

export {
  BelurError,
  BelurHttpError,
  BelurAuthError,
  BelurForbiddenError,
  BelurNotFoundError,
  BelurServerError,
  BelurValidationError,
} from './errors/errors.js'

// ─── Middleware ───────────────────────────────────────────────────────────────

export type { MiddlewareOptions } from './middleware/middleware.js'