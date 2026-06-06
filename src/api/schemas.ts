import { z } from 'zod'

// ─── Balance ─────────────────────────────────────────────────────────────────

export const BalanceSchema = z.object({
  data: z.object({
    balance: z.string(),
  }),
})

export type Balance = z.infer<typeof BalanceSchema>['data']

// ─── Products ────────────────────────────────────────────────────────────────

export const ProductVariantSchema = z.object({
  variant_id: z.number().int().positive(),
  period: z.string(),
  price: z.number().positive(),
  speed: z.number().positive(),
  country: z.string(),
  country_code: z.string().length(2),
  country_icon: z.string().url(),
  discount: z.number().nullable(),
  max_quantity: z.number().int().nonnegative(),
})

export const ProductSchema = z.object({
  name: z.string(),
  variants: z.array(ProductVariantSchema),
})

export const ProductListSchema = z.object({
  data: z.object({
    ipv6: ProductSchema.optional(),
    ipv4_shared: ProductSchema.optional(),
    ipv4: ProductSchema.optional(),
  }),
})

export type ProductVariant = z.infer<typeof ProductVariantSchema>
export type Product = z.infer<typeof ProductSchema>
export type ProductList = z.infer<typeof ProductListSchema>['data']

// ─── Orders ──────────────────────────────────────────────────────────────────

export const CreateOrderSchema = z.object({
  data: z.object({
    order_id: z.number().int().positive(),
  }),
})

export const OrderStatusSchema = z.object({
  data: z.object({
    status: z.boolean(),
  }),
})

export type CreateOrderResult = z.infer<typeof CreateOrderSchema>['data']
export type OrderStatus = z.infer<typeof OrderStatusSchema>['data']

// ─── Proxy ───────────────────────────────────────────────────────────────────

export const ProxyCountrySchema = z.object({
  code: z.string().length(2),
  label: z.string(),
})

export const ProxyPortsSchema = z.object({
  http: z.number().int().positive(),
  socks: z.number().int().positive(),
})

export const ProxySpeedSchema = z.object({
  value: z.number().positive(),
  unit: z.string(),
})

export const ProxyItemSchema = z.object({
  credential_id: z.string(),
  product_id: z.number().int().positive(),
  login: z.string(),
  password: z.string(),
  ip_address: z.string().ip(),
  type: z.enum(['ipv4', 'ipv6', 'ipv4_shared']),
  country: ProxyCountrySchema,
  expired_at: z.string().datetime({ offset: true }),
  is_expired: z.boolean(),
  ports: ProxyPortsSchema,
  speed: ProxySpeedSchema,
})

export const ProxyListSchema = z.object({
  data: z.object({
    items: z.object({
      ipv4: z.array(ProxyItemSchema),
      ipv6: z.array(ProxyItemSchema),
      ipv4_shared: z.array(ProxyItemSchema),
    }),
    total_pages: z.number().int().positive(),
    current_page: z.number().int().positive(),
  }),
})

export type ProxyItem = z.infer<typeof ProxyItemSchema>
export type ProxyList = z.infer<typeof ProxyListSchema>['data']
export type ProxyType = ProxyItem['type']

// ─── Order Info ──────────────────────────────────────────────────────────────

export const OrderStatusCodeSchema = z.union([
  z.literal(-1), // Неуспешный
  z.literal(1),  // Успешный
  z.literal(2),  // Ожидает оплаты
  z.literal(3),  // Просрочен
])

export const OrderTypeSchema = z.union([
  z.literal(-1), // Пополнение баланса
  z.literal(2),  // Продление
  z.literal(3),  // Покупка
  z.literal(4),  // Системное продление
  z.literal(5),  // Системное пополнение баланса
])

export const OrderInfoSchema = z.object({
  data: z.object({
    id: z.number().int().positive(),
    status: OrderStatusCodeSchema,
    is_ready: z.boolean(),
    type: OrderTypeSchema,
    amount: z.number().nonnegative(),
    items: z.array(ProxyItemSchema),
  }),
})

export type OrderStatusCode = z.infer<typeof OrderStatusCodeSchema>
export type OrderType = z.infer<typeof OrderTypeSchema>
export type OrderInfo = z.infer<typeof OrderInfoSchema>['data']

// ─── Renewal ─────────────────────────────────────────────────────────────────

export const RenewalPeriodSchema = z.object({
  label: z.string(),
  key: z.string(),
})

export const RenewalSchema = z.object({
  data: z.object({
    amount: z.number().nonnegative(),
    count: z.number().int().nonnegative(),
    periods: z.array(RenewalPeriodSchema),
  }),
})

export const CreateRenewalSchema = z.object({
  data: z.object({
    order_id: z.number().int().positive(),
  }),
})

export type RenewalPeriod = z.infer<typeof RenewalPeriodSchema>
export type Renewal = z.infer<typeof RenewalSchema>['data']
export type CreateRenewalResult = z.infer<typeof CreateRenewalSchema>['data']

// ─── Requests ────────────────────────────────────────────────────────────────

export const CreateOrderRequestSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
})

export const ProxyListRequestSchema = z.object({
  current_page: z.number().int().positive(),
  per_page: z.number().int().positive().max(100),
  filters: z.object({
    filter_type: z.enum(['all', 'ipv4', 'ipv6', 'ipv4_shared']),
  }),
})

export const RenewalStepOneRequestSchema = z.object({
  proxy_type: z.enum(['ipv4', 'ipv6', 'ipv4_shared']),
  selected_proxy: z.array(z.number().int().positive()).min(1),
  period: z.string().optional(),
})

export const RenewalStepTwoRequestSchema = z.object({
  proxy_type: z.enum(['ipv4', 'ipv6', 'ipv4_shared']),
  selected_proxy: z.array(z.number().int().positive()).min(1),
  period: z.string(),
})

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>
export type ProxyListRequest = z.infer<typeof ProxyListRequestSchema>
export type RenewalStepOneRequest = z.infer<typeof RenewalStepOneRequestSchema>
export type RenewalStepTwoRequest = z.infer<typeof RenewalStepTwoRequestSchema>