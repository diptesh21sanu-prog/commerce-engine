export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'customer' | 'seller' | 'admin';
  seller?: SellerProfile | null;
}

export interface SellerProfile {
  id: string;
  user_id: string;
  store_name: string;
  slug: string;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  commission_rate_basis_points: number;
  description: string;
  support_email: string;
  created_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string;
  product_count?: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  title: string;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  price_cents: number;
  compare_at_price_cents?: number;
  weight_grams?: number;
  is_active: number;
  stock_on_hand?: number;
  reserved_qty?: number;
  available_qty?: number;
}

export interface Product {
  id: string;
  product_id?: string;
  seller_id: string;
  category_id: string;
  title: string;
  slug: string;
  description: string;
  brand: string;
  status: 'draft' | 'pending_approval' | 'published' | 'archived';
  is_deleted: number;
  category_name?: string;
  category_slug?: string;
  seller_name?: string;
  seller_slug?: string;
  min_price_cents: number;
  max_price_cents: number;
  variant_count: number;
  total_available_stock: number;
  primary_image?: string;
  avg_rating?: number;
  review_count?: number;
  created_at: string;
  variants?: ProductVariant[];
  images?: Array<{ id: string; url: string; alt_text?: string }>;
  reviews?: Array<{ id: string; rating: number; title: string; comment: string; author_name: string; created_at: string }>;
}

export interface ShippingZone {
  id: string;
  name: string;
  base_rate_cents: number;
  free_threshold_cents?: number;
  estimated_days_min: number;
  estimated_days_max: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_spend_cents: number;
  max_discount_cents?: number;
}

export interface CartItem {
  id: string;
  variant_id: string;
  quantity: number;
  sku: string;
  variant_title: string;
  price_cents: number;
  available_stock: number;
  product_id: string;
  product_title: string;
  brand: string;
  seller_id: string;
  seller_name: string;
  image_url?: string;
  added_at: string;
}

export interface Cart {
  cartId: string;
  sessionToken?: string;
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  seller_order_id: string;
  variant_id: string;
  snapshot_title: string;
  snapshot_sku: string;
  snapshot_image?: string;
  unit_price_cents: number;
  quantity: number;
  total_price_cents: number;
  created_at: string;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  status: string;
  description: string;
  location?: string;
  created_at: string;
}

export interface SellerOrder {
  id: string;
  order_id: string;
  seller_id: string;
  seller_name?: string;
  suborder_number: string;
  status: string;
  subtotal_cents: number;
  commission_fee_cents: number;
  seller_payout_cents: number;
  carrier?: string;
  tracking_number?: string;
  shipment_status?: string;
  estimated_delivery_at?: string;
  items?: OrderItem[];
  tracking_events?: ShipmentEvent[];
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  shipping_address_json?: string;
  shipping_address?: {
    fullName: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  status: 'CREATED' | 'AWAITING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  currency_rate: number;
  payment_method?: string;
  seller_count?: number;
  total_items_count?: number;
  suborders?: SellerOrder[];
  created_at: string;
  updated_at: string;
}

export interface ReturnRequest {
  id: string;
  seller_order_id: string;
  order_item_id: string;
  user_id: string;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  requested_amount_cents: number;
  approved_amount_cents?: number;
  notes?: string;
  snapshot_title?: string;
  snapshot_sku?: string;
  unit_price_cents?: number;
  item_qty?: number;
  buyer_name?: string;
  buyer_email?: string;
  created_at: string;
}

