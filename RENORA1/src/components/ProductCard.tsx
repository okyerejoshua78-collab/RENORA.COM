import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { Product } from '../types.ts';
import { useApp } from '../context/AppContext.tsx';
import { formatEstimatedValue } from '../utils/currency.ts';
import { ProductImage } from './ProductImage.tsx';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { navigate, currency } = useApp();

  return (
    <article
      onClick={() => navigate(`/product/${product.slug}`)}
      className="group bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="overflow-hidden">
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>

      <div className="p-6 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-[#9A721C]">{product.category_name}</span>
            <span aria-hidden="true">·</span>
            <span>Sample Showcase</span>
          </div>

          <h3 className="text-lg font-semibold text-[#0B192C] leading-snug group-hover:text-[#9A721C] transition-colors">
            {product.name}
          </h3>

          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {product.short_description}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <div>
            <span className="block text-[11px] text-slate-500">Estimated Value</span>
            <span className="text-base font-semibold text-[#0B192C] tabular-nums">
              {formatEstimatedValue(product.estimated_value_usd, currency)}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/product/${product.slug}`);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0B192C] bg-[#F4F6F9] hover:bg-[#0B192C] hover:text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
