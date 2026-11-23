import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import type { CurrencyCode, Product } from '../types.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { SUPPORTED_CURRENCIES } from '../utils/currency.ts';

interface ExplorePageProps {
  initialCategorySlug?: string;
  categoriesView?: boolean;
}

export function ExplorePage({ initialCategorySlug, categoriesView = false }: ExplorePageProps) {
  const { categories, navigate, currency, setCurrency } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategorySlug || 'all');
  const [sortBy, setSortBy] = useState('featured');
  const [maxUsd, setMaxUsd] = useState<string>('0');

  useEffect(() => {
    setSelectedCategory(initialCategorySlug || 'all');
  }, [initialCategorySlug]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (sortBy) params.set('sort', sortBy);
    if (Number(maxUsd) > 0) params.set('maxValue', maxUsd);

    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setProducts(data.products || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query, selectedCategory, sortBy, maxUsd]);

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.slug === selectedCategory),
    [categories, selectedCategory]
  );

  const resetFilters = () => {
    setQuery('');
    setSelectedCategory('all');
    setSortBy('featured');
    setMaxUsd('0');
    if (initialCategorySlug) navigate('/products');
  };

  return (
    <div className="bg-[#F7F8FA] min-h-[75vh]">
      {/* Header Banner */}
      <section className="bg-[#0B192C] text-white py-12 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold tracking-wider text-[#D9B15C] uppercase">
            {categoriesView ? 'Product Directory' : 'RENORA Catalog'}
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-white">
            {activeCategoryObj
              ? activeCategoryObj.name
              : categoriesView
              ? 'All Product Categories'
              : 'Explore Sample Products'}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
            {activeCategoryObj
              ? activeCategoryObj.description
              : 'Browse curated vehicles, properties, electronics, appliances, furniture, and accessories. Open any listing to view full specifications and purchase entry tickets.'}
          </p>
        </div>
      </section>

      {/* Category Directory Cards when viewing /categories */}
      {categoriesView && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => navigate(`/category/${cat.slug}`)}
                className={`text-left p-5 rounded-lg border transition-colors cursor-pointer ${
                  selectedCategory === cat.slug
                    ? 'bg-[#0B192C] text-white border-[#0B192C]'
                    : 'bg-white text-[#0B192C] border-slate-200 hover:border-[#C69736]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-sm">{cat.name}</span>
                  <span className="text-xs font-mono tabular-nums opacity-75">
                    {cat.product_count ?? 0}
                  </span>
                </div>
                <p className="text-xs opacity-80 line-clamp-2">{cat.description}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Search & Filter Controls */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by product name, location, or keyword..."
                aria-label="Search products"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={maxUsd}
                onChange={(e) => setMaxUsd(e.target.value)}
                aria-label="Filter by maximum estimated value"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0B192C]"
              >
                <option value="0">All Estimated Values</option>
                <option value="2500">Up to $2,500 USD eq.</option>
                <option value="10000">Up to $10,000 USD eq.</option>
                <option value="50000">Up to $50,000 USD eq.</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort products"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0B192C]"
              >
                <option value="featured">Featured Order</option>
                <option value="value-desc">Highest Value</option>
                <option value="value-asc">Lowest Value</option>
                <option value="alpha">Name (A–Z)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                aria-label="Select display currency"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md bg-white font-medium focus:outline-none focus:border-[#0B192C]"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.short}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Category Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0 mr-1" aria-hidden="true" />
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                if (initialCategorySlug) navigate('/products');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#0B192C] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.slug);
                  if (initialCategorySlug) navigate(`/category/${cat.slug}`);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === cat.slug
                    ? 'bg-[#0B192C] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Result Count */}
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span className="tabular-nums">
            Showing {products.length} sample {products.length === 1 ? 'product' : 'products'}
          </span>
          {(query || selectedCategory !== 'all' || maxUsd !== '0') && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 font-medium text-[#0B192C] hover:text-[#9A721C] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Product Grid */}
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
        ) : products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-4">
            <h2 className="text-lg font-semibold text-[#0B192C]">No matching sample products found</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Try adjusting your search keywords, clearing the maximum value limit, or switching back to all product categories.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B192C] rounded-md hover:bg-[#132642] cursor-pointer"
            >
              Show All Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
