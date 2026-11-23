import crypto from 'crypto';

export type SupportedCurrency = 'GHS' | 'USD' | 'GBP' | 'CAD';
export type PaymentMethod = 'visa_card' | 'bank_transfer' | 'mobile_money' | 'paypal';
export type MobileNetwork = 'MTN' | 'Vodafone' | 'Tigo';

const CURRENCY_RATES: Record<SupportedCurrency, number> = {
  GHS: 15.6,
  USD: 1,
  GBP: 0.79,
  CAD: 1.38,
};

export function convertFromUsd(usdAmount: number, currency: SupportedCurrency): number {
  const rate = CURRENCY_RATES[currency] ?? 1;
  return Number((usdAmount * rate).toFixed(2));
}

export function generateOrderReference(): string {
  return `RN-ORD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export function generateTicketCode(): string {
  return `RN-TKT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

export function isPayPalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim());
}

export function getPayPalMode(): 'sandbox' | 'live' {
  return process.env.PAYPAL_MODE?.trim().toLowerCase() === 'live' ? 'live' : 'sandbox';
}

function getPayPalBaseUrl(): string {
  return getPayPalMode() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export async function initializePaystackTransaction(params: {
  email: string;
  amountGhs: number;
  reference: string;
  callbackUrl: string;
  channels: ('card' | 'mobile_money')[];
  metadata: Record<string, unknown>;
}): Promise<{ authorizationUrl: string; accessCode: string }> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  }

  const amountMinor = Math.round(params.amountGhs * 100);
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: amountMinor,
      currency: 'GHS',
      reference: params.reference,
      callback_url: params.callbackUrl,
      channels: params.channels,
      metadata: params.metadata,
    }),
  });

  const data = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; access_code?: string };
  };

  if (!res.ok || !data.status || !data.data?.authorization_url) {
    throw new Error(data.message || 'Unable to initialize Paystack transaction.');
  }

  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code || '',
  };
}

export async function verifyPaystackTransaction(reference: string): Promise<{
  verified: boolean;
  amountMinor: number;
  currency: string;
  channel: string;
}> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  }

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const data = (await res.json()) as {
    status?: boolean;
    data?: { status?: string; amount?: number; currency?: string; channel?: string };
  };

  if (!res.ok || !data.status || !data.data) {
    return { verified: false, amountMinor: 0, currency: 'GHS', channel: '' };
  }

  return {
    verified: data.data.status === 'success',
    amountMinor: Number(data.data.amount || 0),
    currency: data.data.currency || 'GHS',
    channel: data.data.channel || '',
  };
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials are not configured.');
  }

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || 'Could not authenticate with PayPal.');
  }
  return data.access_token;
}

export async function createPayPalOrder(params: {
  amount: number;
  currency: 'USD' | 'GBP' | 'CAD';
  referenceId: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ paypalOrderId: string; approveUrl: string }> {
  const accessToken = await getPayPalAccessToken();
  const res = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.referenceId,
          description: params.description.slice(0, 120),
          amount: {
            currency_code: params.currency,
            value: params.amount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'RENORA',
        user_action: 'PAY_NOW',
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    }),
  });

  const data = (await res.json()) as {
    id?: string;
    links?: { rel?: string; href?: string }[];
    message?: string;
  };

  const approveUrl = data.links?.find((l) => l.rel === 'approve')?.href || '';
  if (!res.ok || !data.id || !approveUrl) {
    throw new Error(data.message || 'Unable to create PayPal order.');
  }

  return { paypalOrderId: data.id, approveUrl };
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<{
  captured: boolean;
  referenceId: string;
  status: string;
}> {
  const accessToken = await getPayPalAccessToken();
  const res = await fetch(
    `${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = (await res.json()) as {
    status?: string;
    purchase_units?: { reference_id?: string }[];
  };

  return {
    captured: res.ok && data.status === 'COMPLETED',
    referenceId: data.purchase_units?.[0]?.reference_id || '',
    status: data.status || 'FAILED',
  };
}
