import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Globe,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Ticket,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import type { PaymentConfig, PaymentMethodType, Product } from '../types.ts';
import { formatTicketPrice } from '../utils/currency.ts';

interface TicketCheckoutModuleProps {
  product: Product;
}

export function TicketCheckoutModule({ product }: TicketCheckoutModuleProps) {
  const { user, navigate, currency, apiFetch } = useApp();
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<PaymentMethodType>('mobile_money');

  // Visa Sandbox fields (no raw PAN or CVV collected)
  const [cardholderName, setCardholderName] = useState(
    user ? `${user.first_name} ${user.last_name}`.trim() : ''
  );
  const [cardLast4, setCardLast4] = useState('4242');

  // Ghana Mobile Money fields
  const [mobileNetwork, setMobileNetwork] = useState<'MTN' | 'Vodafone' | 'Tigo'>('MTN');
  const [payerPhone, setPayerPhone] = useState(user?.phone || '');
  const [momoReference, setMomoReference] = useState('');
  const [momoMode, setMomoMode] = useState<'local_transfer' | 'gateway'>('local_transfer');

  // Bank Transfer fields
  const [bankSenderName, setBankSenderName] = useState(
    user ? `${user.first_name} ${user.last_name}`.trim() : ''
  );
  const [bankReference, setBankReference] = useState('');

  // PayPal fields
  const [paypalEmail, setPaypalEmail] = useState(user?.email || '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{
    orderReference: string;
    status: string;
    tickets: string[];
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/payments/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setConfig(data);
          if (data.paystackConfigured) setMomoMode('gateway');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      if (!cardholderName) setCardholderName(`${user.first_name} ${user.last_name}`.trim());
      if (!bankSenderName) setBankSenderName(`${user.first_name} ${user.last_name}`.trim());
      if (!payerPhone && user.phone) setPayerPhone(user.phone);
      if (!paypalEmail) setPaypalEmail(user.email);
    }
  }, [user, cardholderName, bankSenderName, payerPhone, paypalEmail]);

  const unitUsd = product.ticket_price_usd || 5;
  const totalUsd = unitUsd * quantity;

  const selectedMomoMerchantNumber =
    mobileNetwork === 'MTN'
      ? config?.settlement.momo_mtn_number
      : mobileNetwork === 'Vodafone'
      ? config?.settlement.momo_vodafone_number
      : config?.settlement.momo_tigo_number;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        productId: product.id,
        quantity,
        currency,
        paymentMethod: method,
      };

      if (method === 'visa_card') {
        payload.cardholderName = cardholderName;
        payload.last4 = cardLast4;
      } else if (method === 'mobile_money') {
        payload.mobileNetwork = mobileNetwork;
        payload.payerPhone = payerPhone;
        payload.providerReference = momoReference;
        payload.submissionType = momoMode;
      } else if (method === 'bank_transfer') {
        payload.bankSenderName = bankSenderName;
        payload.bankReference = bankReference;
      } else if (method === 'paypal') {
        payload.paypalEmail = paypalEmail;
      }

      const res = await apiFetch('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not process ticket checkout.');
        return;
      }

      if (data.mode === 'redirect' && data.authorizationUrl) {
        // Safe external gateway redirect (Paystack / PayPal HTTPS URL)
        const parsed = new URL(data.authorizationUrl);
        if (parsed.protocol === 'https:') {
          window.location.assign(parsed.toString());
        } else {
          setError('Invalid payment redirect URL.');
        }
        return;
      }

      setReceipt({
        orderReference: data.orderReference,
        status: data.status,
        tickets: data.tickets || [],
        message: data.message,
      });
    } catch {
      setError('Network error while submitting payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const methods: { id: PaymentMethodType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'mobile_money', label: 'Ghana MoMo', icon: Smartphone },
    { id: 'visa_card', label: 'Visa Card', icon: CreditCard },
    { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
    { id: 'paypal', label: 'PayPal', icon: Globe },
  ];

  return (
    <div className="bg-[#0B192C] text-white rounded-lg p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#D9B15C] uppercase tracking-wider flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ticket Entry Checkout</span>
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white tabular-nums">
              {formatTicketPrice(unitUsd, currency)}
            </span>
            <span className="text-xs text-slate-300">per ticket</span>
          </div>
        </div>

        {/* Quantity Stepper */}
        <div className="flex items-center gap-2 bg-[#132642] border border-white/15 rounded-md p-1">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Decrease ticket quantity"
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(50, q + 1))}
            aria-label="Increase ticket quantity"
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="py-3 px-4 bg-[#132642] border border-white/10 rounded-md flex items-center justify-between text-sm">
        <span className="text-slate-300">
          Total ({quantity} {quantity === 1 ? 'ticket' : 'tickets'})
        </span>
        <span className="text-lg font-semibold text-[#D9B15C] tabular-nums">
          {formatTicketPrice(totalUsd, currency)}
        </span>
      </div>

      {!user || user.id === null ? (
        <div className="p-4 bg-[#132642] border border-white/10 rounded-md space-y-3">
          <p className="text-xs text-slate-200 leading-relaxed">
            Sign in or create a customer account to purchase tickets using Visa, Ghana Mobile Money (MTN, Vodafone, Tigo), Bank Transfer, or PayPal.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="py-2.5 px-3 text-xs font-semibold text-[#0B192C] bg-[#D9B15C] hover:bg-[#C69736] rounded-md cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="py-2.5 px-3 text-xs font-semibold text-white border border-white/25 hover:bg-white/10 rounded-md cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </div>
      ) : receipt ? (
        <div className="p-5 bg-white text-[#0B192C] rounded-md space-y-4">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Order {receipt.orderReference}</p>
              <p className="text-xs text-slate-600 leading-relaxed">{receipt.message}</p>
            </div>
          </div>

          {receipt.tickets.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500">Ticket Numbers</p>
              <div className="flex flex-wrap gap-1.5">
                {receipt.tickets.map((code) => (
                  <span
                    key={code}
                    className="px-2 py-1 text-xs font-mono bg-[#F4F6F9] border border-slate-200 rounded text-[#0B192C]"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
            >
              View in Dashboard
            </button>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md cursor-pointer"
            >
              Buy More Tickets
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCheckout} className="space-y-4">
          {/* Payment Method Selector */}
          <div>
            <p className="text-xs font-medium text-slate-300 mb-2">Choose Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {methods.map((m) => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMethod(m.id);
                      setError('');
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#D9B15C] text-[#0B192C] border-[#D9B15C]'
                        : 'bg-[#132642] text-slate-200 border-white/15 hover:border-white/35'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs text-red-100 bg-red-900/60 border border-red-400/40 rounded-md">
              {error}
            </div>
          )}

          {/* Method 1: Ghana Mobile Money */}
          {method === 'mobile_money' && (
            <div className="space-y-3 p-4 bg-[#132642] border border-white/10 rounded-md text-xs">
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium">Select Ghana Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MTN', 'Vodafone', 'Tigo'] as const).map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setMobileNetwork(net)}
                      className={`py-2 px-2 rounded border font-semibold cursor-pointer ${
                        mobileNetwork === net
                          ? 'bg-white text-[#0B192C] border-white'
                          : 'bg-[#0B192C] text-slate-300 border-white/15'
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>

              {config?.paystackConfigured && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setMomoMode('gateway')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                      momoMode === 'gateway' ? 'bg-[#D9B15C] text-[#0B192C]' : 'bg-[#0B192C] text-slate-300'
                    }`}
                  >
                    Instant MoMo Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => setMomoMode('local_transfer')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                      momoMode === 'local_transfer' ? 'bg-[#D9B15C] text-[#0B192C]' : 'bg-[#0B192C] text-slate-300'
                    }`}
                  >
                    Manual MoMo Reference
                  </button>
                </div>
              )}

              {momoMode === 'local_transfer' && (
                <div className="p-3 bg-[#0B192C] border border-white/10 rounded space-y-1 text-slate-300">
                  <p className="font-semibold text-[#D9B15C]">
                    {mobileNetwork} Transfer Instructions
                  </p>
                  <p>Merchant: {config?.settlement.momo_merchant_name || 'RENORA Ghana Mobile Money'}</p>
                  <p className="font-mono text-white">
                    Number: {selectedMomoMerchantNumber || 'Configure in Admin Console'}
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="momo-phone" className="block text-slate-300 mb-1">
                  Your {mobileNetwork} Phone Number
                </label>
                <input
                  id="momo-phone"
                  type="tel"
                  required
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  placeholder="024 XXX XXXX or +23324XXXXXXX"
                  className="w-full px-3 py-2 text-sm bg-white text-[#0B192C] rounded-md"
                />
              </div>

              {momoMode === 'local_transfer' && (
                <div>
                  <label htmlFor="momo-ref" className="block text-slate-300 mb-1">
                    {mobileNetwork} Transaction ID / Reference
                  </label>
                  <input
                    id="momo-ref"
                    type="text"
                    required
                    value={momoReference}
                    onChange={(e) => setMomoReference(e.target.value)}
                    placeholder="e.g. 26194827104"
                    className="w-full px-3 py-2 text-sm bg-white text-[#0B192C] rounded-md"
                  />
                </div>
              )}
            </div>
          )}

          {/* Method 2: Visa Card */}
          {method === 'visa_card' && (
            <div className="space-y-3 p-4 bg-[#132642] border border-white/10 rounded-md text-xs">
              {config?.paystackConfigured ? (
                <p className="text-slate-200 leading-relaxed">
                  You will be redirected to our encrypted Visa Card checkout gateway to complete payment and receive instant active tickets.
                </p>
              ) : (
                <>
                  <p className="text-[#D9B15C] font-medium leading-relaxed">
                    Visa Card Sandbox Preview: Add PAYSTACK_SECRET_KEY in Secrets/.env for live Visa processing. No card numbers or CVV are collected here.
                  </p>
                  <div>
                    <label htmlFor="visa-holder" className="block text-slate-300 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      id="visa-holder"
                      type="text"
                      required
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white text-[#0B192C] rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="visa-last4" className="block text-slate-300 mb-1">
                      Test Receipt Last 4 Digits
                    </label>
                    <input
                      id="visa-last4"
                      type="text"
                      maxLength={4}
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-3 py-2 text-sm font-mono bg-white text-[#0B192C] rounded-md"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Method 3: Bank Transfer */}
          {method === 'bank_transfer' && (
            <div className="space-y-3 p-4 bg-[#132642] border border-white/10 rounded-md text-xs">
              <div className="p-3 bg-[#0B192C] border border-white/10 rounded space-y-1 text-slate-300">
                <p className="font-semibold text-[#D9B15C]">Bank Settlement Details</p>
                <p>Bank: {config?.settlement.bank_name}</p>
                <p>Account Name: {config?.settlement.bank_account_name}</p>
                <p className="font-mono text-white">Account No: {config?.settlement.bank_account_number}</p>
                <p className="font-mono">SWIFT / Code: {config?.settlement.bank_swift_code}</p>
              </div>
              <div>
                <label htmlFor="bank-sender" className="block text-slate-300 mb-1">
                  Sender Account Name
                </label>
                <input
                  id="bank-sender"
                  type="text"
                  required
                  value={bankSenderName}
                  onChange={(e) => setBankSenderName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white text-[#0B192C] rounded-md"
                />
              </div>
              <div>
                <label htmlFor="bank-ref" className="block text-slate-300 mb-1">
                  Bank Transfer Reference / Receipt ID
                </label>
                <input
                  id="bank-ref"
                  type="text"
                  required
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  placeholder="Enter your transfer reference"
                  className="w-full px-3 py-2 text-sm bg-white text-[#0B192C] rounded-md"
                />
              </div>
            </div>
          )}

          {/* Method 4: PayPal */}
          {method === 'paypal' && (
            <div className="space-y-3 p-4 bg-[#132642] border border-white/10 rounded-md text-xs">
              {config?.paypalConfigured ? (
                <p className="text-slate-200 leading-relaxed">
                  You will be redirected to PayPal ({config.paypalMode}) to approve payment in USD, GBP, or CAD and receive instant ticket confirmation.
                </p>
              ) : (
                <>
                  <p className="text-[#D9B15C] font-medium leading-relaxed">
                    PayPal Sandbox Preview: Configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env for live PayPal checkout.
                  </p>
                  <div>
                    <label htmlFor="paypal-email" className="block text-slate-300 mb-1">
                      PayPal Receipt Email
                    </label>
                    <input
                      id="paypal-email"
                      type="email"
                      required
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white text-[#0B192C] rounded-md"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 text-sm font-semibold text-[#0B192C] bg-[#D9B15C] hover:bg-[#C69736] rounded-md transition-colors disabled:opacity-60 cursor-pointer"
          >
            {submitting
              ? 'Processing...'
              : `Complete Payment (${formatTicketPrice(totalUsd, currency)})`}
          </button>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D9B15C] shrink-0" aria-hidden="true" />
            <span>Prices and totals are verified server-side prior to ticket issuance.</span>
          </p>
        </form>
      )}
    </div>
  );
}
