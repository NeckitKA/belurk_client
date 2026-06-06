import type { ZodType } from 'zod'
import type { BelurClient } from '../api/client.js'
import {
  BalanceSchema,
  ProductListSchema,
  CreateOrderSchema,
  OrderStatusSchema,
  OrderInfoSchema,
  ProxyListSchema,
  RenewalSchema,
  CreateRenewalSchema,
  CreateOrderRequestSchema,
  ProxyListRequestSchema,
  RenewalStepOneRequestSchema,
  RenewalStepTwoRequestSchema,
} from '../api/schemas.js'
import type {
  Balance,
  ProductList,
  CreateOrderRequest,
  CreateOrderResult,
  OrderStatus,
  OrderInfo,
  ProxyList,
  Renewal,
  CreateRenewalResult,
  RenewalStepOneRequest,
  RenewalStepTwoRequest,
} from '../api/schemas.js'
import {
  BelurValidationError,
  ok,
  fail,
  toErrorPayload,
  type BelurResult,
} from '../errors/errors.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validate<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new BelurValidationError(result.error.issues)
  }
  return result.data
}

// ─── Controller ──────────────────────────────────────────────────────────────

export class BelurController {
  constructor(private readonly client: BelurClient) {}

  // ─── Account ───────────────────────────────────────────────────────────────

  async getBalance(): Promise<BelurResult<Balance>> {
    try {
      const raw = await this.client.getBalance()
      const parsed = validate(BalanceSchema, raw)
      return ok(parsed.data)
    } catch (err) {
      return fail(toErrorPayload(err))
    }
  }

  // ─── Products ──────────────────────────────────────────────────────────────

  async getAvailableProducts(): Promise<BelurResult<ProductList>> {
    try {
      const raw = await this.client.getAvailableProducts()
      const parsed = validate(ProductListSchema, raw)
      return ok(parsed.data)
    } catch (err) {
      return fail(toErrorPayload(err))
    }
  }

  // ─── Orders ────────────────────────────────────────────────────────────────

  async createOrder(input: CreateOrderRequest): Promise<BelurResult<CreateOrderResult>> {
    try {
      const body = validate(CreateOrderRequestSchema, input)
      const raw = await this.client.createOrder(body)
      const parsed = validate(CreateOrderSchema, raw)
      return ok(parsed.data)
    } catch (err) {
      return fail(toErrorPayload(err))
    }
  }

  async getOrderStatus(orderId: number): Promise<BelurResult<OrderStatus>> {
    try {
      const raw = await this.client.getOrderStatus(orderId)
      const parsed = validate(OrderStatusSchema, raw)
      return ok(parsed.data)
    } catch (err) {
      return fail(toErrorPayload(err))
    }
  }

  async getOrderInfo(orderId: number): Promise<BelurResult<OrderInfo>> {
    try {
      const raw = await this.client.getOrderInfo(orderId)
      const parsed = validate(OrderInfoSchema, raw)
      return ok(parsed.data)
    } catch (err) {
      return fail(toErrorPayload(err))
    }
  }

  // ─── Proxy ─────────────────────────────────────────────────────────────────

  async getProxyList(input: {
    current_page?: number
    per_page?: number
    filters?: { filter_type?: 'all' | 'ipv4' | 'ipv6' | 'ipv4_shared' }
  } = {}): Promise<BelurResult<ProxyList & { count: number }>> {
    try {
      const body = validate(ProxyListRequestSchema, {
        current_page: input.current_page ?? 1,
        per_page: input.per_page ?? 100,
        filters: {
          filter_type: input.filters?.filter_type ?? 'all',
        },
      })
      const raw = await this.client.getProxyList(body)
      const parsed = validate(ProxyListSchema, raw)
      return ok({
        ...parsed.data,
        count:
          parsed.data.items.ipv4.length +
          parsed.data.items.ipv6.length +
          parsed.data.items.ipv4_shared.length,
      })
    } catch (err) {
      return fail(toErrorPayload(err))
    }
  }

  // ─── Renewal ───────────────────────────────────────────────────────────────

  async getRenewalOptions(input: RenewalStepOneRequest): Promise<BelurResult<Renewal>> {
    try {
      const body = validate(RenewalStepOneRequestSchema, input)
      const raw = await this.client.getRenewalOptions(body)
      const parsed = validate(RenewalSchema, raw)
      return ok(parsed.data)
    } catch (err) {
      return fail(toErrorPayload(err))
    }
  }

  async confirmRenewal(input: RenewalStepTwoRequest): Promise<BelurResult<CreateRenewalResult>> {
    try {
      const body = validate(RenewalStepTwoRequestSchema, input)
      const raw = await this.client.confirmRenewal(body)
      const parsed = validate(CreateRenewalSchema, raw)
      return ok(parsed.data)
    } catch (err) {
      return fail(toErrorPayload(err))
    }
  }
}