// ─── Client ───────────────────────────────────────────────────────────────────
export { createBelurClient }         from './client.js'
export type { BelurClientOptions }   from './client.js'
export type { BelurClient }          from './client.js'

// ─── Middleware ───────────────────────────────────────────────────────────────
export type { MiddlewareOptions } from './middleware.js'

// ─── Errors ───────────────────────────────────────────────────────────────────
export {
  BelurError,
  BelurHttpError,
  BelurAuthError,
  BelurForbiddenError,
  BelurNotFoundError,
  BelurServerError,
  BelurValidationError,
  ok,
  fail,
  toErrorPayload,
} from './errors.js'
export type { BelurResult, BelurErrorPayload } from './errors.js'

// ─── Schemas (values) ─────────────────────────────────────────────────────────
export {
  BalanceSchema,
  ProductListSchema,
  CreateOrderSchema,
  ProxyListSchema,
  CreateOrderRequestSchema,
  ProxyListRequestSchema,
} from './schemas.js'

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Balance,
  ProductVariant,
  Product,
  ProductList,
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
  RenewalCurrency,
  RenewalStepOneRequest,
  RenewalStepTwoRequest,
  CreateRenewalResult,
  ProxyListRequest,
} from './schemas.js'