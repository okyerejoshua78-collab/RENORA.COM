import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, HelpCircle, MailWarning, Shield, Ticket, User as UserIcon } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import type { Announcement, CurrencyCode, NotificationItem, PaymentOrder, TicketItem } from '../types.ts';
import { SUPPORTED_COUNTRIES, SUPPORTED_CURRENCIES } from '../utils/currency.ts';

type TabKey = 'profile' | 'security' | 'notifications' | 'tickets' | 'support';

export function CustomerDashboardPage() {
  const { user, navigate, apiFetch, updateUser } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  // Profile form state
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [country, setCountry] = useState(user?.country || 'Ghana');
  const [phone, setPhone] = useState(user?.phone || '');
  const [preferredCurrency, setPreferredCurrency] = useState<CurrencyCode>(
    (user?.preferred_currency as CurrencyCode) || 'GHS'
  );
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Verification resend state
  const [verifyFeedback, setVerifyFeedback] = useState('');
  const [resending, setResending] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Notifications & announcements
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setCountry(user.country);
      setPhone(user.phone || '');
      setPreferredCurrency((user.preferred_currency as CurrencyCode) || 'GHS');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    apiFetch('/api/account/notifications')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setNotifications(data.notifications || []);
          setAnnouncements(data.announcements || []);
        }
      })
      .catch(() => {});

    apiFetch('/api/account/tickets')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setOrders(data.orders || []);
          setTickets(data.tickets || []);
        }
      })
      .catch(() => {});
  }, [user, apiFetch]);

  if (!user) {
    return (
      <div className="bg-[#F7F8FA] min-h-[70vh] py-16 px-4">
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
          <h1 className="font-editorial text-2xl font-semibold text-[#0B192C]">Customer Dashboard</h1>
          <p className="text-sm text-slate-600">
            Please sign in or create an account to view your personal RENORA dashboard.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="px-5 py-2.5 text-sm font-semibold text-[#0B192C] border border-slate-300 rounded-md cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    setSavingProfile(true);
    try {
      const res = await apiFetch('/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName,
          lastName,
          country,
          phone,
          preferredCurrency,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileErr(data.error || 'Could not update profile.');
      } else {
        updateUser(data.user);
        setProfileMsg('Profile and regional preferences updated.');
      }
    } catch {
      setProfileErr('Network error updating profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg('');
    setPassErr('');
    setChangingPass(true);
    try {
      const res = await apiFetch('/api/account/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassErr(data.error || 'Could not change password.');
      } else {
        setPassMsg(data.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPassErr('Network error updating password.');
    } finally {
      setChangingPass(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    setVerifyFeedback('');
    try {
      const res = await apiFetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json();
      setVerifyFeedback(data.message || 'Verification email requested.');
    } catch {
      setVerifyFeedback('Could not send verification email.');
    } finally {
      setResending(false);
    }
  };

  const markRead = async (id: number) => {
    await apiFetch(`/api/account/notifications/${id}/read`, { method: 'POST' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
  };

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'tickets', label: 'My Tickets & Payments', icon: Ticket },
    { key: 'profile', label: 'Profile & Preferences', icon: UserIcon },
    { key: 'security', label: 'Security Settings', icon: Shield },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'support', label: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <div className="bg-[#F7F8FA] min-h-[80vh] pb-20">
      {/* Header */}
      <section className="bg-[#0B192C] text-white py-10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-[#D9B15C] uppercase">
              Customer Account Dashboard
            </p>
            <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-white">
              Welcome, {user.first_name} {user.last_name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {user.email} · {user.country} · Display Currency: {user.preferred_currency}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {user.email_verified ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-300 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Email Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[#D9B15C] font-medium">
                <MailWarning className="w-4 h-4" />
                <span>Email Verification Pending</span>
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Email Verification Notice */}
        {!user.email_verified && (
          <div className="p-4 bg-[#F9F3E3] border border-[#C69736]/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm text-[#0B192C]">
              <p className="font-semibold">Verify Your Email Address</p>
              <p className="text-xs text-slate-700 mt-0.5">
                Confirm your email address to keep your account ready for official RENORA communications.
              </p>
              {verifyFeedback && <p className="text-xs font-medium text-[#9A721C] mt-1.5">{verifyFeedback}</p>}
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-[#132642] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              {resending ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    active ? 'bg-[#0B192C] text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Main Tab Content */}
          <div className="lg:col-span-9 bg-white border border-slate-200 rounded-lg p-6 sm:p-8">
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl">
                <div>
                  <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">
                    Profile & Regional Settings
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Keep your contact details, country eligibility context, and preferred display currency up to date.
                  </p>
                </div>

                {profileErr && <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">{profileErr}</div>}
                {profileMsg && <div className="p-3 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md">{profileMsg}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dash-first" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                      First Name
                    </label>
                    <input
                      id="dash-first"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="dash-last" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                      Last Name
                    </label>
                    <input
                      id="dash-last"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dash-country" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                      Country
                    </label>
                    <select
                      id="dash-country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white"
                    >
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dash-currency" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                      Preferred Currency
                    </label>
                    <select
                      id="dash-currency"
                      value={preferredCurrency}
                      onChange={(e) => setPreferredCurrency(e.target.value as CurrencyCode)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="dash-phone" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                    International Phone Number (Optional)
                  </label>
                  <input
                    id="dash-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+233 ..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#132642] rounded-md cursor-pointer"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
                <div>
                  <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">
                    Security & Password
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Passwords are stored using cryptographic scrypt hashing. Update your password anytime.
                  </p>
                </div>

                {passErr && <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">{passErr}</div>}
                {passMsg && <div className="p-3 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md">{passMsg}</div>}

                <div>
                  <label htmlFor="sec-curr" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                    Current Password
                  </label>
                  <input
                    id="sec-curr"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="sec-new" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                    New Password (8+ characters)
                  </label>
                  <input
                    id="sec-new"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="sec-confirm" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    id="sec-confirm"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  disabled={changingPass}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#132642] rounded-md cursor-pointer"
                >
                  {changingPass ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">
                    Account Notifications
                  </h2>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-slate-500">No personal notifications yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                      {notifications.map((n) => (
                        <div key={n.id} className="p-4 flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-[#0B192C]">{n.title}</p>
                            <p className="text-sm text-slate-600">{n.message}</p>
                            <span className="text-xs font-mono text-slate-400">{n.created_at}</span>
                          </div>
                          {!n.is_read && (
                            <button
                              type="button"
                              onClick={() => markRead(n.id)}
                              className="text-xs font-semibold text-[#9A721C] hover:text-[#0B192C] whitespace-nowrap cursor-pointer"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#0B192C]">Official Platform Announcements</h3>
                  <div className="space-y-3">
                    {announcements.map((a) => (
                      <div key={a.id} className="p-4 bg-[#F7F8FA] border border-slate-200 rounded-lg space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-medium text-[#9A721C]">{a.market_scope}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{a.published_at.slice(0, 10)}</span>
                        </div>
                        <p className="text-sm font-semibold text-[#0B192C]">{a.title}</p>
                        <p className="text-sm text-slate-600">{a.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tickets' && (
              <div className="space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">
                      My Tickets & Payment History
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Track your ticket codes and payment confirmations across Visa, Ghana Mobile Money, Bank Transfers, and PayPal.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/products')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
                  >
                    Browse Products
                  </button>
                </div>

                {/* Issued Tickets */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#0B192C]">Issued Tickets ({tickets.length})</h3>
                  {tickets.length === 0 ? (
                    <div className="p-6 bg-[#F7F8FA] border border-slate-200 rounded-lg text-sm text-slate-600">
                      You have not purchased any tickets yet. Open any product page to purchase a ticket.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#F7F8FA] text-xs text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Ticket Code</th>
                            <th className="px-4 py-3 font-semibold">Product</th>
                            <th className="px-4 py-3 font-semibold">Order Ref</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {tickets.map((t) => (
                            <tr key={t.id}>
                              <td className="px-4 py-3 font-mono font-semibold text-[#0B192C]">{t.ticket_code}</td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/product/${t.product_slug}`)}
                                  className="text-[#0B192C] hover:text-[#9A721C] font-medium cursor-pointer text-left"
                                >
                                  {t.product_name}
                                </button>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-600">{t.order_reference}</td>
                              <td className="px-4 py-3 text-xs font-medium capitalize">
                                {t.status === 'active'
                                  ? 'Active'
                                  : t.status === 'sandbox'
                                  ? 'Sandbox Test'
                                  : t.status === 'pending'
                                  ? 'Pending Verification'
                                  : 'Cancelled'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Payment Orders */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#0B192C]">Payment Orders ({orders.length})</h3>
                  {orders.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#F7F8FA] text-xs text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Reference</th>
                            <th className="px-4 py-3 font-semibold">Method</th>
                            <th className="px-4 py-3 font-semibold text-right">Qty</th>
                            <th className="px-4 py-3 font-semibold text-right">Amount</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {orders.map((o) => (
                            <tr key={o.id}>
                              <td className="px-4 py-3 font-mono text-xs text-[#0B192C]">{o.order_reference}</td>
                              <td className="px-4 py-3 text-xs text-slate-700">
                                {o.payment_method === 'mobile_money'
                                  ? `Mobile Money (${o.mobile_network})`
                                  : o.payment_method === 'visa_card'
                                  ? 'Visa Card'
                                  : o.payment_method === 'bank_transfer'
                                  ? 'Bank Transfer'
                                  : 'PayPal'}
                              </td>
                              <td className="px-4 py-3 text-right font-mono tabular-nums">{o.quantity}</td>
                              <td className="px-4 py-3 text-right font-mono tabular-nums">
                                {o.display_currency} {Number(o.display_amount).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-xs font-medium capitalize">
                                {o.status.replace('_', ' ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-4 max-w-xl">
                <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">Help & Support</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Need assistance with your account details, email verification, or regional availability? Explore our FAQ or send an inquiry directly to the RENORA support desk.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/contact')}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
                  >
                    Contact Support
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/faq')}
                    className="px-5 py-2.5 text-sm font-semibold text-[#0B192C] border border-slate-300 rounded-md cursor-pointer"
                  >
                    Read FAQs
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
