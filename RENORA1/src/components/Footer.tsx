import React from 'react';
import { Globe, Download, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { RenoraLogo } from './RenoraLogo.tsx';
import { SUPPORTED_COUNTRIES, SUPPORTED_CURRENCIES } from '../utils/currency.ts';
import type { CurrencyCode } from '../types.ts';

export function Footer() {
  const { navigate, currency, setCurrency, selectedCountry, setSelectedCountry } = useApp();

  return (
    <footer className="bg-[#0B192C] text-slate-300 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Brand Column */}
          <div className="space-y-4">
            <RenoraLogo variant="light" size="md" />
            <p className="text-sm font-medium text-[#D9B15C]">
              More Possibilities, Less Spending.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              An international product and lifestyle showcase platform designed to connect people—starting in Ghana and expanding globally—with transparent product information and future opportunity models.
            </p>
          </div>

          {/* Explore & Company */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-white uppercase">Platform</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button type="button" onClick={() => navigate('/products')} className="hover:text-white transition-colors cursor-pointer">
                  Explore Products
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/categories')} className="hover:text-white transition-colors cursor-pointer">
                  Product Categories
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/how-it-works')} className="hover:text-white transition-colors cursor-pointer">
                  How RENORA Works
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/about')} className="hover:text-white transition-colors cursor-pointer">
                  About RENORA
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/contact')} className="hover:text-white transition-colors cursor-pointer">
                  Contact Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/faq')} className="hover:text-white transition-colors cursor-pointer">
                  Frequently Asked Questions
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Governance */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-white uppercase">Governance & Legal (Drafts)</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button type="button" onClick={() => navigate('/legal/privacy')} className="hover:text-white transition-colors cursor-pointer">
                  Privacy Policy (Draft)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/legal/terms')} className="hover:text-white transition-colors cursor-pointer">
                  Terms and Conditions (Draft)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/legal/responsible-participation')} className="hover:text-white transition-colors cursor-pointer">
                  Responsible Participation (Draft)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/admin')} className="hover:text-white transition-colors cursor-pointer">
                  Administration Portal
                </button>
              </li>
              <li>
                <a
                  href="/api/download-project"
                  download="renora-website-source.zip"
                  className="inline-flex items-center gap-1.5 text-[#D9B15C] hover:text-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Download Project ZIP</span>
                </a>
              </li>
            </ul>
          </div>

          {/* International Market & Currency */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold tracking-wider text-white uppercase flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#C69736]" aria-hidden="true" />
              <span>Region & Currency</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="footer-country" className="block text-xs text-slate-400 mb-1">
                  Target Market
                </label>
                <select
                  id="footer-country"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#132642] border border-white/15 rounded-md text-white focus:outline-none focus:border-[#C69736]"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="footer-currency" className="block text-xs text-slate-400 mb-1">
                  Display Currency
                </label>
                <select
                  id="footer-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-3 py-2 text-xs bg-[#132642] border border-white/15 rounded-md text-white focus:outline-none focus:border-[#C69736]"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-4 text-xs text-slate-400">
              <span>Social Channels:</span>
              <button type="button" onClick={() => navigate('/contact')} className="hover:text-white transition-colors cursor-pointer">
                LinkedIn
              </button>
              <button type="button" onClick={() => navigate('/contact')} className="hover:text-white transition-colors cursor-pointer">
                Instagram
              </button>
              <button type="button" onClick={() => navigate('/contact')} className="hover:text-white transition-colors cursor-pointer">
                X
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Regulatory & Copyright Row */}
        <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-start gap-2 max-w-2xl">
            <ShieldCheck className="w-4 h-4 text-[#C69736] shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              Platform Governance Notice: Ticket checkout supports Visa cards, Bank Transfers, Ghana Mobile Money (MTN, Vodafone, Tigo), and PayPal. Availability of campaigns remains subject to applicable regional laws and local approvals.
            </p>
          </div>
          <p className="whitespace-nowrap shrink-0">
            © {new Date().getFullYear()} RENORA. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
