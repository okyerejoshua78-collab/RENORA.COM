import type { CurrencyCode } from '../types.ts';

// Illustrative reference rates against USD for multi-market catalog display
const CURRENCY_CONFIG: Record<
  CurrencyCode,
  { symbol: string; rate: number; locale: string; label: string }
> = {
  GHS: { symbol: 'GH₵', rate: 15.6, locale: 'en-GH', label: 'Ghana Cedi (GHS)' },
  USD: { symbol: '$', rate: 1, locale: 'en-US', label: 'US Dollar (USD)' },
  GBP: { symbol: '£', rate: 0.79, locale: 'en-GB', label: 'British Pound (GBP)' },
  CAD: { symbol: 'CA$', rate: 1.38, locale: 'en-CA', label: 'Canadian Dollar (CAD)' },
};

export const SUPPORTED_CURRENCIES: { code: CurrencyCode; label: string; short: string }[] = [
  { code: 'GHS', label: 'Ghana Cedi (GHS)', short: 'GHS · GH' },
  { code: 'USD', label: 'US Dollar (USD)', short: 'USD · US' },
  { code: 'GBP', label: 'British Pound (GBP)', short: 'GBP · UK' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)', short: 'CAD · CA' },
];

export const SUPPORTED_COUNTRIES = [
  { name: 'Ghana', dialCode: '+233', defaultCurrency: 'GHS' as CurrencyCode },
  { name: 'United States', dialCode: '+1', defaultCurrency: 'USD' as CurrencyCode },
  { name: 'United Kingdom', dialCode: '+44', defaultCurrency: 'GBP' as CurrencyCode },
  { name: 'Canada', dialCode: '+1', defaultCurrency: 'CAD' as CurrencyCode },
  { name: 'Nigeria', dialCode: '+234', defaultCurrency: 'USD' as CurrencyCode },
  { name: 'South Africa', dialCode: '+27', defaultCurrency: 'USD' as CurrencyCode },
  { name: 'Germany', dialCode: '+49', defaultCurrency: 'USD' as CurrencyCode },
  { name: 'Other International', dialCode: '+', defaultCurrency: 'USD' as CurrencyCode },
];

export function formatEstimatedValue(usdAmount: number, currency: CurrencyCode): string {
  const cfg = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  const converted = Math.round(usdAmount * cfg.rate);
  return `${cfg.symbol}${converted.toLocaleString('en-US')}`;
}

export function formatTicketPrice(usdAmount: number, currency: CurrencyCode): string {
  const cfg = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  const converted = Number((usdAmount * cfg.rate).toFixed(2));
  return `${cfg.symbol}${converted.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function isSafeMediaSrc(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith('/src/assets/') || url.startsWith('/uploads/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
