import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Globe, MapPin, ShieldAlert, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import type { CurrencyCode, FaqItem, Product } from '../types.ts';
import { ProductImage } from '../components/ProductImage.tsx';
import { TicketCheckoutModule } from '../components/TicketCheckoutModule.tsx';
import { formatEstimatedValue, SUPPORTED_CURRENCIES } from '../utils/currency.ts';

export function ProductDetailPage({ slug }: { slug: string }) {
  const { navigate, currency, setCurrency } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    setActiveImageIdx(0);

    fetch(`/api/products/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) {
          if (active) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }
        const data = await res.json();
        if (active) {
          setProduct(data.product);
          setFaqs(data.faqs || []);
          setOpenFaqId(data.faqs?.[0]?.id ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setNotFound(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-8">
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 aspect-[4/3] bg-slate-200 rounded-lg" />
          <div className="lg:col-span-5 space-y-4">
            <div className="h-8 bg-slate-200 rounded w-3/4" />
            <div className="h-6 bg-slate-200 rounded w-1/2" />
            <div className="h-32 bg-slate-200 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-editorial text-3xl font-semibold text-[#0B192C]">Product Not Found</h1>
        <p className="text-sm text-slate-600">
          The requested showcase item could not be located in the RENORA catalog.
        </p>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
        >
          Back to Explore Products
        </button>
      </div>
    );
  }

  const images = product.images.length > 0 ? product.images : [''];
  const mainImage = images[activeImageIdx] || images[0];

  return (
    <div className="bg-white pb-20">
      {/* Breadcrumb Strip */}
      <div className="bg-[#F7F8FA] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="inline-flex items-center gap-1.5 font-medium text-[#0B192C] hover:text-[#9A721C] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>All Products</span>
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => navigate(`/category/${product.category_slug}`)}
              className="hover:text-[#0B192C] cursor-pointer"
            >
              {product.category_name}
            </button>
            <span aria-hidden="true">/</span>
            <span className="text-[#0B192C] font-medium truncate max-w-[260px] sm:max-w-md">
              {product.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Currency:</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              aria-label="Display currency"
              className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-[#0B192C]"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Primary Split: Clickable Gallery Left, Summary & Regulatory Notice Right */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Image Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-lg overflow-hidden border border-slate-200 bg-[#F7F8FA]">
              <ProductImage src={mainImage} alt={`${product.name} view ${activeImageIdx + 1}`} />
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {images.map((imgUrl, idx) => (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    aria-label={`View photo ${idx + 1} of ${product.name}`}
                    className={`rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                      activeImageIdx === idx
                        ? 'border-[#C69736] ring-1 ring-[#C69736]'
                        : 'border-slate-200 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <ProductImage src={imgUrl} alt={`${product.name} thumbnail ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contiguous Product Module */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-[#9A721C]">{product.category_name}</span>
                <span aria-hidden="true">·</span>
                <span>Sample Catalog Item</span>
              </div>
              <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#0B192C] leading-tight">
                {product.name}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">{product.short_description}</p>
            </div>

            {/* Estimated Value */}
            <div className="p-5 bg-[#F7F8FA] border border-slate-200 rounded-lg space-y-1">
              <span className="text-xs font-medium text-slate-500">Estimated Market Value</span>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-semibold text-[#0B192C] tabular-nums">
                  {formatEstimatedValue(product.estimated_value_usd, currency)}
                </span>
                {currency !== 'USD' && (
                  <span className="text-xs font-mono text-slate-500 tabular-nums">
                    (${product.estimated_value_usd.toLocaleString('en-US')} USD baseline)
                  </span>
                )}
              </div>
            </div>

            {/* Key Facts */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-y border-slate-200 py-5">
              <div>
                <dt className="text-xs text-slate-500">Condition</dt>
                <dd className="font-medium text-[#0B192C] mt-0.5">{product.condition}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#9A721C]" aria-hidden="true" />
                  <span>Reference Location</span>
                </dt>
                <dd className="font-medium text-[#0B192C] mt-0.5">{product.location}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[#9A721C]" aria-hidden="true" />
                  <span>Planned Market Eligibility (Subject to Local Law)</span>
                </dt>
                <dd className="font-medium text-[#0B192C] mt-0.5">
                  {product.eligibility_countries.join(' · ')}
                </dd>
              </div>
            </dl>

            {/* Ticket Purchase & Multi-Payment Checkout */}
            <TicketCheckoutModule product={product} />
          </div>
        </div>
      </section>

      {/* Full-Width Product Details, Specifications, Delivery & Rules */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Description & Delivery */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-3">
              <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">
                Detailed Overview
              </h2>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                {product.detailed_description}
              </p>
            </div>

            <div className="p-6 bg-[#F7F8FA] border border-slate-200 rounded-lg space-y-3">
              <h3 className="text-base font-semibold text-[#0B192C] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#9A721C]" aria-hidden="true" />
                <span>Delivery & Handover Information</span>
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">{product.delivery_info}</p>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-lg space-y-3">
              <h3 className="text-base font-semibold text-[#0B192C] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#9A721C]" aria-hidden="true" />
                <span>Important Information & Official Rules Framework</span>
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">{product.important_info}</p>
              <p className="text-xs text-slate-600 pt-3 border-t border-slate-100 leading-relaxed">
                {product.official_rules}
              </p>
            </div>
          </div>

          {/* Structured Specifications Table */}
          <div className="lg:col-span-5">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-[#0B192C] text-white">
                <h2 className="text-base font-semibold">Technical & Item Specifications</h2>
              </div>
              <dl className="divide-y divide-slate-200 bg-white">
                {product.specs.map((spec) => (
                  <div key={spec.label} className="px-6 py-3.5 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 text-sm">
                    <dt className="text-slate-500 font-medium">{spec.label}</dt>
                    <dd className="text-[#0B192C] font-semibold sm:text-right">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* Product & Platform FAQs */}
        {faqs.length > 0 && (
          <div className="pt-8 border-t border-slate-200 space-y-6">
            <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">
              Frequently Asked Questions
            </h2>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white">
              {faqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id}>
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-semibold text-[#0B192C]">{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
