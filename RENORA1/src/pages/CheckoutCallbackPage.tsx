import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export function CheckoutCallbackPage() {
  const { navigate, apiFetch, user } = useApp();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your payment with the gateway...');
  const [tickets, setTickets] = useState<string[]>([]);
  const [orderRef, setOrderRef] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get('provider');
    const reference = params.get('reference') || params.get('trxref') || '';
    const token = params.get('token') || '';
    const ref = params.get('ref') || '';

    if (!user) {
      setStatus('error');
      setMessage('Your session expired during gateway redirect. Sign in to view your payment status.');
      return;
    }

    if (provider === 'paystack' && reference) {
      apiFetch('/api/payments/paystack/verify', {
        method: 'POST',
        body: JSON.stringify({ reference }),
      })
        .then(async (r) => {
          const data = await r.json();
          if (r.ok && data.verified) {
            setStatus('success');
            setOrderRef(data.orderReference);
            setTickets(data.tickets || []);
            setMessage('Payment confirmed and tickets issued.');
          } else {
            setStatus('error');
            setMessage(data.error || 'Could not verify Paystack payment.');
          }
        })
        .catch(() => {
          setStatus('error');
          setMessage('Network error verifying Paystack payment.');
        });
      return;
    }

    if (provider === 'paypal' && token) {
      apiFetch('/api/payments/paypal/capture', {
        method: 'POST',
        body: JSON.stringify({ token, ref }),
      })
        .then(async (r) => {
          const data = await r.json();
          if (r.ok && data.verified) {
            setStatus('success');
            setOrderRef(data.orderReference);
            setTickets(data.tickets || []);
            setMessage('PayPal payment captured and tickets issued.');
          } else {
            setStatus('error');
            setMessage(data.error || 'Could not capture PayPal payment.');
          }
        })
        .catch(() => {
          setStatus('error');
          setMessage('Network error capturing PayPal payment.');
        });
      return;
    }

    setStatus('error');
    setMessage('Missing payment verification parameters.');
  }, [apiFetch, user]);

  return (
    <div className="bg-[#F7F8FA] min-h-[70vh] py-16 px-4">
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-lg p-8 text-center space-y-5">
        {status === 'success' && <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />}
        {status === 'error' && <AlertCircle className="w-10 h-10 text-red-700 mx-auto" />}
        <h1 className="font-editorial text-2xl font-semibold text-[#0B192C]">
          {status === 'verifying'
            ? 'Verifying Payment'
            : status === 'success'
            ? 'Tickets Issued'
            : 'Verification Notice'}
        </h1>
        {orderRef && <p className="text-xs font-mono text-slate-500">Order: {orderRef}</p>}
        <p className="text-sm text-slate-600">{message}</p>

        {tickets.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {tickets.map((t) => (
              <span key={t} className="px-2.5 py-1 text-xs font-mono bg-[#F4F6F9] border border-slate-200 rounded">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
          >
            Go to Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-5 py-2.5 text-sm font-semibold text-[#0B192C] border border-slate-300 rounded-md cursor-pointer"
          >
            Explore Products
          </button>
        </div>
      </div>
    </div>
  );
}
