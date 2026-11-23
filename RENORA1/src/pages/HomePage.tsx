import React, { useEffect, useState } from 'react';
import { ArrowRight, Car, Home, Smartphone, Laptop, Tv, Refrigerator, Sofa, Watch, Shield, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import type { Product, CurrencyCode } from '../types.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { SUPPORTED_CURRENCIES } from '../utils/currency.ts';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'cars-and-vehicles': Car,
  'houses-and-properties': Home,
  smartphones: Smartphone,
  'computers-and-laptops': Laptop,
  electronics: Tv,
  'home-appliances': Refrigerator,
  furniture: Sofa,
  'lifestyle-and-accessories': Watch,
};

export function HomePage() {
  const { navigate, categories, currency, setCurrency } = useApp();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/products?featured=1')
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setFeaturedProducts((data.products || []).slice(0, 6));
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const steps = [
    {
      num: '01',
      title: 'Explore',
      desc: 'Discover curated vehicles, properties, technology, and lifestyle products featured across the RENORA catalog.',
    },
    {
      num: '02',
      title: 'Learn',
      desc: 'Review full product specifications, estimated market values, delivery regions, and applicable official rules.',
    },
    {
      num: '03',
      title: 'Participate',
      desc: 'Participate only when a specific offering is legally approved, licensed for your jurisdiction, and officially open.',
    },
    {
      num: '04',
      title: 'Results',
      desc: 'View verified outcomes and published announcements once an officially approved campaign has concluded.',
    },
  ];

  const commitments = [
    {
      title: 'Radical Transparency',
      desc: 'Clear separation between preview sample items and future legally approved campaigns—never misleading claims.',
    },
    {
      title: 'Customer Protection',
      desc: 'Eligibility rules, valuation baselines, and regional delivery terms are documented upfront before any campaign.',
    },
    {
      title: 'Clear Product Information',
      desc: 'Every showcase listing carries technical specs, condition disclosures, registration status, and location context.',
    },
    {
      title: 'Secure Accounts',
      desc: 'Cryptographic password hashing, email verification, rate-limited endpoints, and server-verified sessions.',
    },
    {
      title: 'Responsible Operations',
      desc: 'Verified ticket checkout supports Visa cards, Bank Transfers, Ghana Mobile Money (MTN, Vodafone, Tigo), and PayPal.',
    },
    {
      title: 'Verified Announcements',
      desc: 'Official updates on Ghanaian launch readiness and international market approvals are published centrally.',
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-[#0B192C] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#D9B15C] uppercase">
                More Possibilities, Less Spending.
              </p>
              <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold leading-[1.08] tracking-tight text-white">
                Big Possibilities. Affordable Opportunities.
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                Discover a world of valuable products and exciting opportunities with RENORA. From vehicles and properties to technology and everyday essentials, explore more possibilities with less spending.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#0B192C] bg-[#D9B15C] hover:bg-[#C69736] rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Explore Products</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/how-it-works')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white border border-white/25 hover:border-white/50 hover:bg-white/5 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Learn How It Works</span>
                </button>
              </div>

              <div className="pt-4 border-t border-white/10 text-xs text-slate-400 flex items-start gap-2.5 max-w-xl">
                <Shield className="w-4 h-4 text-[#D9B15C] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Starting in Ghana with international currency support (GHS, USD, GBP, CAD). Purchase tickets securely via Visa, Bank Transfer, MTN/Vodafone/Tigo Mobile Money, or PayPal.
                </span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[280px] sm:min-h-[380px] rounded-lg overflow-hidden border border-white/10 bg-[#132642]">
                <img
                  src="/src/assets/images/hero_renora_showcase_1795385154209.jpg"
                  alt="RENORA luxury architectural villa and executive sedan showcase"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B192C]/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
                  <span>Ghana Launch Foundation · International Expansion Ready</span>
                  <span className="font-mono text-[#D9B15C]">Sample Showcase</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Sample Products */}
      <section className="py-16 lg:py-24 bg-[#F7F8FA] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-semibold tracking-wider text-[#9A721C] uppercase">
                Curated Sample Catalog
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#0B192C]">
                Featured Showcase Products
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Illustrative products demonstrating how RENORA presents verified specifications, market valuations, and transparent rules across diverse categories.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-md">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCurrency(c.code as CurrencyCode)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                      currency === c.code
                        ? 'bg-[#0B192C] text-white'
                        : 'text-slate-600 hover:text-[#0B192C]'
                    }`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate('/products')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B192C] hover:text-[#9A721C] transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>View All Products</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-slate-200" />
                  <div className="p-6 space-y-3">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Product Categories Directory */}
      <section className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-semibold tracking-wider text-[#9A721C] uppercase">
                Multi-Category Architecture
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#0B192C]">
                Explore by Product Category
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Built as a broad international lifestyle brand spanning mobility, real estate, personal technology, and home living.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/categories')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B192C] hover:text-[#9A721C] transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>All Categories</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.slug] || Globe;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigate(`/category/${cat.slug}`)}
                  className="text-left p-6 bg-[#F7F8FA] hover:bg-[#0B192C] group border border-slate-200 hover:border-[#0B192C] rounded-lg transition-colors flex flex-col justify-between gap-6 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="w-6 h-6 text-[#9A721C] group-hover:text-[#D9B15C] transition-colors" aria-hidden="true" />
                    <span className="text-xs font-mono tabular-nums text-slate-500 group-hover:text-slate-300">
                      {cat.product_count ?? 0} {(cat.product_count ?? 0) === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-[#0B192C] group-hover:text-white transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-600 group-hover:text-slate-300 line-clamp-2 leading-relaxed transition-colors">
                      {cat.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* How RENORA Works */}
      <section className="py-16 lg:py-24 bg-[#0B192C] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-3 mb-12">
            <p className="text-xs font-semibold tracking-wider text-[#D9B15C] uppercase">
              Proposed Operating Model
            </p>
            <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-white">
              How RENORA Is Designed to Work
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Our proposed four-stage model aims to make valuable products accessible through transparent, low-cost participation—activated only where legally permitted and licensed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div
                key={step.num}
                className="p-6 bg-[#132642] border border-white/10 rounded-lg space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <span className="font-mono text-sm font-medium text-[#D9B15C] tabular-nums">
                    {step.num}.
                  </span>
                  <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Select any product to purchase entry tickets via Visa, Bank Transfer, Ghana Mobile Money (MTN, Vodafone, Tigo), or PayPal, and track your tickets in your account dashboard.
            </p>
            <button
              type="button"
              onClick={() => navigate('/how-it-works')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#0B192C] bg-[#D9B15C] hover:bg-[#C69736] rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Read Full Governance Guide</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* Trust, Transparency & International Expansion */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-5">
              <p className="text-xs font-semibold tracking-wider text-[#9A721C] uppercase">
                Trust & Accountability
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#0B192C]">
                Built for Transparency from Day One
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                RENORA is establishing its initial operational foundation in Ghana while designing its platform architecture for responsible expansion into the United States, United Kingdom, Canada, and additional international markets.
              </p>
              <div className="p-5 bg-[#F7F8FA] border border-slate-200 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-[#0B192C] uppercase tracking-wide">
                  International Readiness
                </p>
                <p className="text-sm text-slate-600">
                  Ghana (Initial Market) · United States · United Kingdom · Canada · International Markets
                </p>
                <p className="text-xs text-slate-500">
                  Availability of future offerings will vary strictly according to local laws and regulatory approvals.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="px-5 py-3 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#132642] rounded-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  Create Customer Account
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/about')}
                  className="px-5 py-3 text-sm font-semibold text-[#0B192C] border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  About RENORA
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {commitments.map((item) => (
                <div key={item.title} className="p-6 border border-slate-200 rounded-lg bg-white space-y-2">
                  <h3 className="text-base font-semibold text-[#0B192C]">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
