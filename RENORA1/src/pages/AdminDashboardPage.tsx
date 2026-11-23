import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CreditCard,
  Download,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Plus,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import type { Announcement, Category, FaqItem, PaymentOrder, Product, SettlementConfig } from '../types.ts';

type AdminTab = 'overview' | 'payments' | 'products' | 'categories' | 'customers' | 'announcements' | 'faqs' | 'messages' | 'activity';

interface AdminStats {
  products: number;
  categories: number;
  customers: number;
  verifiedCustomers: number;
  messages: number;
  announcements: number;
  participationEnabled: boolean;
  smtpConfigured: boolean;
}

export function AdminDashboardPage() {
  const { user, setSession, apiFetch, categories, refreshCategories } = useApp();
  const [adminStatus, setAdminStatus] = useState<{ needsSetup: boolean; envConfigured: boolean } | null>(null);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [settlement, setSettlement] = useState<SettlementConfig>({
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_swift_code: '',
    momo_merchant_name: '',
    momo_mtn_number: '',
    momo_vodafone_number: '',
    momo_tigo_number: '',
  });
  const [gatewayFlags, setGatewayFlags] = useState({ paystackConfigured: false, paypalConfigured: false });

  // Product editor state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [pName, setPName] = useState('');
  const [pCategory, setPCategory] = useState('cars-and-vehicles');
  const [pValue, setPValue] = useState('20000');
  const [pTicketPrice, setPTicketPrice] = useState('10');
  const [pCondition, setPCondition] = useState('Brand New / Sample Specification');
  const [pLocation, setPLocation] = useState('Accra, Ghana');
  const [pShortDesc, setPShortDesc] = useState('');
  const [pDetailedDesc, setPDetailedDesc] = useState('');
  const [pDelivery, setPDelivery] = useState('');
  const [pImages, setPImages] = useState<string[]>([]);
  const [pSpecsText, setPSpecsText] = useState('Condition: New\nWarranty: Illustrative 12 Months');
  const [pFeatured, setPFeatured] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Category / Announcement / FAQ creation state
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annSummary, setAnnSummary] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annScope, setAnnScope] = useState('Ghana & International');
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');

  useEffect(() => {
    fetch('/api/admin/status')
      .then((r) => r.json())
      .then(setAdminStatus)
      .catch(() => {});
  }, []);

  const loadAdminData = useCallback(async () => {
    if (!user || user.role !== 'admin') return;

    const [ovRes, prodRes, custRes, annRes, faqRes, msgRes, actRes, payRes] = await Promise.all([
      apiFetch('/api/admin/overview'),
      apiFetch('/api/products'),
      apiFetch('/api/admin/customers'),
      apiFetch('/api/admin/announcements'),
      apiFetch('/api/admin/faqs'),
      apiFetch('/api/admin/messages'),
      apiFetch('/api/admin/activity'),
      apiFetch('/api/admin/payments'),
    ]);

    if (ovRes.ok) setStats((await ovRes.json()).stats);
    if (prodRes.ok) setProducts((await prodRes.json()).products || []);
    if (custRes.ok) setCustomers((await custRes.json()).customers || []);
    if (annRes.ok) setAnnouncements((await annRes.json()).announcements || []);
    if (faqRes.ok) setFaqs((await faqRes.json()).faqs || []);
    if (msgRes.ok) setMessages((await msgRes.json()).messages || []);
    if (actRes.ok) setLogs((await actRes.json()).logs || []);
    if (payRes.ok) {
      const pData = await payRes.json();
      setPaymentOrders(pData.orders || []);
      if (pData.settlement) setSettlement(pData.settlement);
      setGatewayFlags({
        paystackConfigured: Boolean(pData.paystackConfigured),
        paypalConfigured: Boolean(pData.paypalConfigured),
      });
    }
  }, [user, apiFetch]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleAdminSetupOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const endpoint = adminStatus?.needsSetup ? '/api/admin/setup' : '/api/admin/login';
      const body = adminStatus?.needsSetup ? { passcode, confirmPasscode } : { passcode };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
      } else {
        setSession(data.token, data.user);
        setPasscode('');
        setConfirmPasscode('');
        setAdminStatus({ needsSetup: false, envConfigured: adminStatus?.envConfigured ?? false });
      }
    } catch {
      setAuthError('Network error.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="bg-[#F7F8FA] min-h-[75vh] py-14 px-4">
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-8 space-y-6">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-wider text-[#9A721C] uppercase">
              Restricted Access
            </p>
            <h1 className="font-editorial text-2xl font-semibold text-[#0B192C]">
              {adminStatus?.needsSetup ? 'Initialize Administrator Passcode' : 'Administrator Sign In'}
            </h1>
            <p className="text-sm text-slate-600">
              {adminStatus?.needsSetup
                ? 'First-run setup: choose a strong administrator passcode (10+ characters) to secure this console.'
                : 'Enter the server-configured administrator passcode to manage products, customers, and announcements.'}
            </p>
          </div>

          {authError && (
            <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminSetupOrLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-pass" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                Administrator Passcode
              </label>
              <input
                id="admin-pass"
                type="password"
                required
                minLength={adminStatus?.needsSetup ? 10 : 1}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md"
              />
            </div>

            {adminStatus?.needsSetup && (
              <div>
                <label htmlFor="admin-pass-confirm" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                  Confirm Passcode
                </label>
                <input
                  id="admin-pass-confirm"
                  type="password"
                  required
                  minLength={10}
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || adminStatus === null}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#132642] rounded-md cursor-pointer"
            >
              {authLoading
                ? 'Verifying...'
                : adminStatus?.needsSetup
                ? 'Claim & Open Admin Console'
                : 'Sign In to Admin Console'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const openNewProduct = () => {
    setEditingId(null);
    setPName('');
    setPCategory(categories[0]?.slug || 'cars-and-vehicles');
    setPValue('20000');
    setPTicketPrice('5');
    setPCondition('Brand New / Sample Specification');
    setPLocation('Accra, Ghana');
    setPShortDesc('');
    setPDetailedDesc('');
    setPDelivery('Insured delivery coordinated within Ghana and approved international regions.');
    setPImages([]);
    setPSpecsText('Condition: Brand New\nAvailability: Sample Showcase');
    setPFeatured(true);
    setShowProductForm(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingId(p.id);
    setPName(p.name);
    setPCategory(p.category_slug);
    setPValue(String(p.estimated_value_usd));
    setPTicketPrice(String(p.ticket_price_usd ?? 5));
    setPCondition(p.condition);
    setPLocation(p.location);
    setPShortDesc(p.short_description);
    setPDetailedDesc(p.detailed_description);
    setPDelivery(p.delivery_info);
    setPImages(p.images);
    setPSpecsText(p.specs.map((s) => `${s.label}: ${s.value}`).join('\n'));
    setPFeatured(p.is_featured);
    setShowProductForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await apiFetch('/api/admin/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok && data.url) {
        setPImages((prev) => [...prev, data.url]);
        setActionMsg('Image uploaded successfully.');
      } else {
        setActionMsg(data.error || 'Image upload failed.');
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const specs = pSpecsText
      .split('\n')
      .map((line) => {
        const idx = line.indexOf(':');
        if (idx === -1) return null;
        return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
      })
      .filter(Boolean);

    const payload = {
      name: pName,
      category_slug: pCategory,
      estimated_value_usd: Number(pValue),
      ticket_price_usd: Number(pTicketPrice),
      condition: pCondition,
      location: pLocation,
      short_description: pShortDesc,
      detailed_description: pDetailedDesc,
      delivery_info: pDelivery,
      images: pImages,
      specs,
      is_featured: pFeatured,
    };

    const url = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products';
    const method = editingId ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setShowProductForm(false);
      setActionMsg(editingId ? 'Product updated.' : 'Product added to showcase catalog.');
      await loadAdminData();
      await refreshCategories();
    } else {
      const data = await res.json();
      setActionMsg(data.error || 'Could not save product.');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const res = await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setActionMsg('Product removed.');
      await loadAdminData();
      await refreshCategories();
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ name: catName, description: catDesc }),
    });
    if (res.ok) {
      setCatName('');
      setCatDesc('');
      setActionMsg('Category created.');
      await refreshCategories();
      await loadAdminData();
    }
  };

  const toggleCustomerStatus = async (id: number, currentStatus: string) => {
    const next = currentStatus === 'active' ? 'suspended' : 'active';
    await apiFetch(`/api/admin/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ account_status: next }),
    });
    await loadAdminData();
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify({ title: annTitle, summary: annSummary, body: annBody, market_scope: annScope }),
    });
    if (res.ok) {
      setAnnTitle('');
      setAnnSummary('');
      setAnnBody('');
      setActionMsg('Announcement published.');
      await loadAdminData();
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/faqs', {
      method: 'POST',
      body: JSON.stringify({ question: faqQuestion, answer: faqAnswer }),
    });
    if (res.ok) {
      setFaqQuestion('');
      setFaqAnswer('');
      setActionMsg('FAQ entry saved.');
      await loadAdminData();
    }
  };

  const handleOrderAction = async (orderId: number, action: 'approve' | 'reject') => {
    const res = await apiFetch(`/api/admin/payments/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setActionMsg(action === 'approve' ? 'Payment verified and tickets activated.' : 'Order rejected.');
      await loadAdminData();
    }
  };

  const handleSaveSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/payment-settings', {
      method: 'PUT',
      body: JSON.stringify(settlement),
    });
    if (res.ok) {
      setActionMsg('Bank & Ghana Mobile Money settlement details updated.');
      await loadAdminData();
    }
  };

  const navItems: { key: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'payments', label: 'Payments & Tickets', icon: CreditCard },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'categories', label: 'Categories', icon: FolderKanban },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'announcements', label: 'Announcements', icon: Megaphone },
    { key: 'faqs', label: 'FAQs', icon: HelpCircle },
    { key: 'messages', label: 'Inquiries', icon: MessageSquare },
    { key: 'activity', label: 'Activity Log', icon: Activity },
  ];

  return (
    <div className="bg-[#F7F8FA] min-h-[82vh] pb-16">
      <section className="bg-[#0B192C] text-white py-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#D9B15C] uppercase">
              Administration Console
            </p>
            <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-white">
              RENORA Management Portal
            </h1>
          </div>
          <a
            href="/api/download-project"
            download="renora-website-source.zip"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0B192C] bg-[#D9B15C] hover:bg-[#C69736] rounded-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Project ZIP</span>
          </a>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {actionMsg && (
          <div className="mb-6 p-3.5 bg-white border border-[#C69736]/50 rounded-md text-sm text-[#0B192C] flex justify-between items-center">
            <span>{actionMsg}</span>
            <button type="button" onClick={() => setActionMsg('')} className="text-xs text-slate-500 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    tab === item.key ? 'bg-[#0B192C] text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </aside>

          <main className="lg:col-span-9 bg-white border border-slate-200 rounded-lg p-6">
            {tab === 'overview' && stats && (
              <div className="space-y-6">
                <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">Platform Overview</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <span className="text-xs text-slate-500">Showcase Products</span>
                    <p className="text-2xl font-semibold text-[#0B192C] tabular-nums mt-1">{stats.products}</p>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <span className="text-xs text-slate-500">Categories</span>
                    <p className="text-2xl font-semibold text-[#0B192C] tabular-nums mt-1">{stats.categories}</p>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <span className="text-xs text-slate-500">Registered Customers</span>
                    <p className="text-2xl font-semibold text-[#0B192C] tabular-nums mt-1">{stats.customers}</p>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <span className="text-xs text-slate-500">Verified Emails</span>
                    <p className="text-2xl font-semibold text-[#0B192C] tabular-nums mt-1">{stats.verifiedCustomers}</p>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <span className="text-xs text-slate-500">Contact Inquiries</span>
                    <p className="text-2xl font-semibold text-[#0B192C] tabular-nums mt-1">{stats.messages}</p>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <span className="text-xs text-slate-500">Announcements</span>
                    <p className="text-2xl font-semibold text-[#0B192C] tabular-nums mt-1">{stats.announcements}</p>
                  </div>
                </div>

                <div className="p-4 bg-[#F7F8FA] border border-slate-200 rounded-lg text-sm space-y-1">
                  <p className="font-semibold text-[#0B192C]">Operational Safeguards</p>
                  <p className="text-slate-600">
                    Ticket Sales & Winner Draws: <strong className="text-[#0B192C]">Disabled (Showcase Mode)</strong>
                  </p>
                  <p className="text-slate-600">
                    Email Service Mode:{' '}
                    <strong className="text-[#0B192C]">
                      {stats.smtpConfigured ? 'Configured SMTP Server' : 'Local Console Preview Fallback'}
                    </strong>
                  </p>
                </div>
              </div>
            )}

            {tab === 'products' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">Manage Products</h2>
                  <button
                    type="button"
                    onClick={openNewProduct}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Sample Product</span>
                  </button>
                </div>

                {showProductForm && (
                  <form onSubmit={handleSaveProduct} className="p-5 bg-[#F7F8FA] border border-slate-200 rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-semibold text-[#0B192C]">
                        {editingId ? 'Edit Product' : 'New Sample Product'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowProductForm(false)}
                        className="text-xs text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Product Name</label>
                        <input
                          type="text"
                          required
                          value={pName}
                          onChange={(e) => setPName(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Category</label>
                        <select
                          value={pCategory}
                          onChange={(e) => setPCategory(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                        >
                          {categories.map((c: Category) => (
                            <option key={c.slug} value={c.slug}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Estimated Value (USD)</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={pValue}
                          onChange={(e) => setPValue(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Ticket Price (USD)</label>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          required
                          value={pTicketPrice}
                          onChange={(e) => setPTicketPrice(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Location</label>
                        <input
                          type="text"
                          value={pLocation}
                          onChange={(e) => setPLocation(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Short Description</label>
                      <input
                        type="text"
                        required
                        value={pShortDesc}
                        onChange={(e) => setPShortDesc(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Detailed Description</label>
                      <textarea
                        rows={3}
                        value={pDetailedDesc}
                        onChange={(e) => setPDetailedDesc(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Delivery Information</label>
                      <input
                        type="text"
                        value={pDelivery}
                        onChange={(e) => setPDelivery(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Specifications (One per line: Key: Value)
                      </label>
                      <textarea
                        rows={4}
                        value={pSpecsText}
                        onChange={(e) => setPSpecsText(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold">Upload Product Photograph</label>
                      <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingImage ? 'Uploading...' : 'Choose JPEG/PNG/WebP Image'}</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImageUpload} />
                      </label>
                      {pImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {pImages.map((img, i) => (
                            <div key={`${img}-${i}`} className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 px-2 py-1 rounded">
                              <span className="truncate max-w-[160px]">{img}</span>
                              <button
                                type="button"
                                onClick={() => setPImages((prev) => prev.filter((_, idx) => idx !== i))}
                                className="text-red-600 cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-medium text-[#0B192C]">
                      <input type="checkbox" checked={pFeatured} onChange={(e) => setPFeatured(e.target.checked)} />
                      <span>Feature on Homepage</span>
                    </label>

                    <div>
                      <button
                        type="submit"
                        className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
                      >
                        {editingId ? 'Save Product Updates' : 'Create Sample Product'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F7F8FA] text-xs text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Product</th>
                        <th className="px-4 py-3 font-semibold">Category</th>
                        <th className="px-4 py-3 font-semibold text-right">Est. USD</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-[#0B192C]">{p.name}</td>
                          <td className="px-4 py-3 text-slate-600">{p.category_name}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            ${p.estimated_value_usd.toLocaleString('en-US')}
                          </td>
                          <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEditProduct(p)}
                              className="text-xs font-semibold text-[#0B192C] hover:text-[#9A721C] cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id)}
                              className="text-xs font-semibold text-red-700 hover:text-red-900 cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'categories' && (
              <div className="space-y-6">
                <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">Manage Categories</h2>
                <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#F7F8FA] border border-slate-200 rounded-lg">
                  <input
                    type="text"
                    required
                    placeholder="Category Name"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Short Description"
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer">
                    Add Category
                  </button>
                </form>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                  {categories.map((c) => (
                    <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#0B192C]">{c.name}</p>
                        <p className="text-xs text-slate-600">{c.description}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-500 tabular-nums">
                        {c.product_count ?? 0} items
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'customers' && (
              <div className="space-y-4">
                <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">Customer Accounts</h2>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F7F8FA] text-xs text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Country</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {customers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            No registered customer accounts yet.
                          </td>
                        </tr>
                      ) : (
                        customers.map((c) => (
                          <tr key={String(c.id)}>
                            <td className="px-4 py-3 font-medium">
                              {String(c.first_name)} {String(c.last_name)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{String(c.email)}</td>
                            <td className="px-4 py-3 text-slate-600">{String(c.country)}</td>
                            <td className="px-4 py-3 text-xs">
                              {String(c.account_status)} · {c.email_verified ? 'Verified' : 'Unverified'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => toggleCustomerStatus(Number(c.id), String(c.account_status))}
                                className="text-xs font-semibold text-[#0B192C] hover:text-[#9A721C] cursor-pointer"
                              >
                                {c.account_status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'announcements' && (
              <div className="space-y-6">
                <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">Publish Announcements</h2>
                <form onSubmit={handleAddAnnouncement} className="p-4 bg-[#F7F8FA] border border-slate-200 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Announcement Title"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                    />
                    <input
                      type="text"
                      placeholder="Market Scope (e.g. Ghana & Global)"
                      value={annScope}
                      onChange={(e) => setAnnScope(e.target.value)}
                      className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Short Summary"
                    value={annSummary}
                    onChange={(e) => setAnnSummary(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <textarea
                    rows={3}
                    required
                    placeholder="Full Announcement Message"
                    value={annBody}
                    onChange={(e) => setAnnBody(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer">
                    Publish Announcement
                  </button>
                </form>

                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div key={a.id} className="p-4 border border-slate-200 rounded-lg flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#0B192C]">{a.title}</p>
                        <p className="text-xs text-slate-600 mt-1">{a.body}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/announcements/${a.id}`, { method: 'DELETE' });
                          await loadAdminData();
                        }}
                        className="text-red-700 hover:text-red-900 cursor-pointer"
                        aria-label="Delete announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'faqs' && (
              <div className="space-y-6">
                <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">Manage FAQs</h2>
                <form onSubmit={handleAddFaq} className="p-4 bg-[#F7F8FA] border border-slate-200 rounded-lg space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Question"
                    value={faqQuestion}
                    onChange={(e) => setFaqQuestion(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <textarea
                    rows={2}
                    required
                    placeholder="Answer"
                    value={faqAnswer}
                    onChange={(e) => setFaqAnswer(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer">
                    Add FAQ
                  </button>
                </form>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                  {faqs.map((f) => (
                    <div key={f.id} className="p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#0B192C]">{f.question}</p>
                        <p className="text-xs text-slate-600 mt-1">{f.answer}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/faqs/${f.id}`, { method: 'DELETE' });
                          await loadAdminData();
                        }}
                        className="text-red-700 hover:text-red-900 cursor-pointer"
                        aria-label="Delete FAQ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'messages' && (
              <div className="space-y-4">
                <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">Contact Inquiries</h2>
                {messages.length === 0 ? (
                  <p className="text-sm text-slate-500">No contact inquiries received yet.</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => (
                      <div key={String(m.id)} className="p-4 border border-slate-200 rounded-lg space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>
                            {String(m.name)} ({String(m.email)}) · {String(m.country)}
                          </span>
                          <span className="font-mono">{String(m.created_at)}</span>
                        </div>
                        <p className="text-sm font-semibold text-[#0B192C]">{String(m.subject)}</p>
                        <p className="text-sm text-slate-600">{String(m.message)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'payments' && (
              <div className="space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">
                      Ticket Orders & Payment Verification
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Paystack (Visa/MoMo):{' '}
                      <strong>{gatewayFlags.paystackConfigured ? 'Live Key Configured' : 'Sandbox / Manual Mode'}</strong> · PayPal:{' '}
                      <strong>{gatewayFlags.paypalConfigured ? 'Credentials Configured' : 'Sandbox Preview'}</strong>
                    </p>
                  </div>
                </div>

                {/* Orders Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F8FA] text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 font-semibold">Order Ref</th>
                        <th className="px-3 py-3 font-semibold">Customer</th>
                        <th className="px-3 py-3 font-semibold">Product</th>
                        <th className="px-3 py-3 font-semibold">Method / Reference</th>
                        <th className="px-3 py-3 font-semibold text-right">Amount</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                        <th className="px-3 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {paymentOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                            No ticket orders submitted yet.
                          </td>
                        </tr>
                      ) : (
                        paymentOrders.map((o) => (
                          <tr key={o.id}>
                            <td className="px-3 py-3 font-mono font-semibold text-[#0B192C] whitespace-nowrap">
                              {o.order_reference}
                            </td>
                            <td className="px-3 py-3">
                              <span className="block font-medium text-[#0B192C]">
                                {o.first_name} {o.last_name}
                              </span>
                              <span className="text-slate-500">{o.customer_email}</span>
                            </td>
                            <td className="px-3 py-3">
                              {o.product_name} ({o.quantity}x)
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              <span className="block font-medium text-[#0B192C]">
                                {o.payment_method === 'mobile_money'
                                  ? `${o.mobile_network} (${o.payer_phone})`
                                  : o.payment_method === 'bank_transfer'
                                  ? `Bank (${o.bank_sender_name})`
                                  : o.payment_method === 'visa_card'
                                  ? 'Visa Card'
                                  : 'PayPal'}
                              </span>
                              <span className="font-mono text-[11px]">
                                {o.bank_reference || o.provider_reference || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                              {o.display_currency} {Number(o.display_amount).toFixed(2)}
                            </td>
                            <td className="px-3 py-3 capitalize font-medium">{o.status.replace('_', ' ')}</td>
                            <td className="px-3 py-3 text-right whitespace-nowrap space-x-2">
                              {o.status === 'pending_verification' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOrderAction(o.id, 'approve')}
                                    className="px-2.5 py-1 bg-[#0B192C] text-white rounded cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOrderAction(o.id, 'reject')}
                                    className="px-2.5 py-1 text-red-700 border border-red-200 rounded cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bank & Mobile Money Settlement Instructions */}
                <form onSubmit={handleSaveSettlement} className="p-5 bg-[#F7F8FA] border border-slate-200 rounded-lg space-y-4">
                  <h3 className="text-base font-semibold text-[#0B192C]">
                    Bank Transfer & Ghana Mobile Money Settlement Accounts
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={settlement.bank_name}
                        onChange={(e) => setSettlement({ ...settlement, bank_name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Bank Account Name</label>
                      <input
                        type="text"
                        value={settlement.bank_account_name}
                        onChange={(e) => setSettlement({ ...settlement, bank_account_name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Bank Account Number</label>
                      <input
                        type="text"
                        value={settlement.bank_account_number}
                        onChange={(e) => setSettlement({ ...settlement, bank_account_number: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">SWIFT / Sort / Branch Code</label>
                      <input
                        type="text"
                        value={settlement.bank_swift_code}
                        onChange={(e) => setSettlement({ ...settlement, bank_swift_code: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Mobile Money Merchant Name</label>
                      <input
                        type="text"
                        value={settlement.momo_merchant_name}
                        onChange={(e) => setSettlement({ ...settlement, momo_merchant_name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">MTN MoMo Number</label>
                      <input
                        type="text"
                        value={settlement.momo_mtn_number}
                        onChange={(e) => setSettlement({ ...settlement, momo_mtn_number: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Vodafone Cash (Telecel) Number</label>
                      <input
                        type="text"
                        value={settlement.momo_vodafone_number}
                        onChange={(e) => setSettlement({ ...settlement, momo_vodafone_number: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">AirtelTigo Money Number</label>
                      <input
                        type="text"
                        value={settlement.momo_tigo_number}
                        onChange={(e) => setSettlement({ ...settlement, momo_tigo_number: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
                  >
                    Save Settlement Details
                  </button>
                </form>
              </div>
            )}

            {tab === 'activity' && (
              <div className="space-y-4">
                <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">Website Activity Log</h2>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F8FA] text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold">Timestamp</th>
                        <th className="px-3 py-2.5 font-semibold">Actor</th>
                        <th className="px-3 py-2.5 font-semibold">Action</th>
                        <th className="px-3 py-2.5 font-semibold">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {logs.map((l) => (
                        <tr key={String(l.id)}>
                          <td className="px-3 py-2.5 font-mono text-slate-500 whitespace-nowrap">{String(l.created_at)}</td>
                          <td className="px-3 py-2.5">{String(l.actor_email)}</td>
                          <td className="px-3 py-2.5 font-medium text-[#0B192C]">{String(l.action)}</td>
                          <td className="px-3 py-2.5 text-slate-600">{String(l.details || '-')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
