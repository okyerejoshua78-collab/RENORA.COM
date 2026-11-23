export type CurrencyCode = 'GHS' | 'USD' | 'GBP' | 'CAD';

export type MarketCountry =
  | 'Ghana'
  | 'United States'
  | 'United Kingdom'
  | 'Canada'
  | 'Nigeria'
  | 'South Africa'
  | 'Germany'
  | 'Other International';

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  product_count?: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  category_slug: string;
  category_name: string;
  estimated_value_usd: number;
  ticket_price_usd: number;
  short_description: string;
  detailed_description: string;
  condition: string;
  location: string;
  delivery_info: string;
  important_info: string;
  official_rules: string;
  eligibility_countries: string[];
  specs: ProductSpec[];
  images: string[];
  is_featured: boolean;
  is_sample: boolean;
  campaign_status: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number | null;
  first_name: string;
  last_name: string;
  email: string;
  country: string;
  phone: string;
  preferred_currency: CurrencyCode | string;
  role: 'customer' | 'admin';
  email_verified: boolean;
  account_status: string;
}

export interface Announcement {
  id: number;
  title: string;
  summary: string;
  body: string;
  market_scope: string;
  is_published?: number;
  published_at: string;
}

export interface FaqItem {
  id: number;
  product_id: number | null;
  product_name?: string;
  question: string;
  answer: string;
  sort_order?: number;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

export type PaymentMethodType = 'visa_card' | 'bank_transfer' | 'mobile_money' | 'paypal';

export interface SettlementConfig {
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_swift_code: string;
  momo_merchant_name: string;
  momo_mtn_number: string;
  momo_vodafone_number: string;
  momo_tigo_number: string;
}

export interface PaymentConfig {
  paystackConfigured: boolean;
  paypalConfigured: boolean;
  paypalMode: 'sandbox' | 'live';
  settlement: SettlementConfig;
}

export interface PaymentOrder {
  id: number;
  order_reference: string;
  user_id: number;
  product_id: number;
  product_name?: string;
  product_slug?: string;
  customer_email?: string;
  first_name?: string;
  last_name?: string;
  quantity: number;
  unit_price_usd: number;
  total_usd: number;
  display_currency: CurrencyCode | string;
  display_amount: number;
  payment_method: PaymentMethodType;
  provider_name: string;
  provider_reference: string;
  mobile_network: string;
  payer_phone: string;
  bank_sender_name: string;
  bank_reference: string;
  status: 'pending' | 'pending_verification' | 'paid' | 'sandbox_paid' | 'failed' | 'rejected';
  notes: string;
  created_at: string;
}

export interface TicketItem {
  id: number;
  ticket_code: string;
  order_id: number;
  order_reference: string;
  product_id: number;
  product_name: string;
  product_slug: string;
  payment_method: PaymentMethodType;
  mobile_network: string;
  status: 'pending' | 'active' | 'sandbox' | 'cancelled';
  created_at: string;
}
