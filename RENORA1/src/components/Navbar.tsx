import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { RenoraLogo } from './RenoraLogo.tsx';
import { SUPPORTED_CURRENCIES } from '../utils/currency.ts';
import type { CurrencyCode } from '../types.ts';

export function Navbar() {
  const { route, navigate, user, signOut, currency, setCurrency } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Explore Products', path: '/products' },
    { label: 'Categories', path: '/categories' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'About Us', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  const handleNav = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  const isActive = (path: string) => {
    const cleanRoute = route.split('?')[0];
    if (path === '/') return cleanRoute === '/';
    return cleanRoute === path || cleanRoute.startsWith(`${path}/`);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav('/')}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C69736] rounded-md py-1 cursor-pointer shrink-0"
          aria-label="RENORA Home"
        >
          <RenoraLogo variant="dark" size="md" />
        </button>

        {/* Zone 2: Single-line navigation links */}
        <nav className="hidden lg:flex items-center gap-6" aria-label="Primary Navigation">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNav(item.path)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  active
                    ? 'text-[#0B192C] border-[#C69736]'
                    : 'text-slate-600 border-transparent hover:text-[#0B192C] hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Account Action */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => handleNav(user.role === 'admin' ? '/admin' : '/dashboard')}
                className="text-sm font-medium text-[#0B192C] hover:text-[#9A721C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {user.role === 'admin' ? 'Admin Console' : 'Dashboard'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  handleNav('/');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] rounded-md hover:bg-[#132642] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleNav('/signin')}
                className="text-sm font-medium text-slate-700 hover:text-[#0B192C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleNav('/register')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] rounded-md hover:bg-[#132642] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Create Account
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-[#0B192C] hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-2 shadow-lg">
          <div className="grid grid-cols-1 gap-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNav(item.path)}
                  className={`w-full text-left px-3 py-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    active ? 'bg-[#0B192C] text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <label htmlFor="mobile-currency" className="text-xs font-medium text-slate-600">
              Display Currency
            </label>
            <select
              id="mobile-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-md text-[#0B192C]"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.short}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => handleNav(user.role === 'admin' ? '/admin' : '/dashboard')}
                  className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
                >
                  {user.role === 'admin' ? 'Admin Console' : 'Customer Dashboard'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    handleNav('/');
                  }}
                  className="w-full py-3 px-4 text-sm font-medium text-slate-700 border border-slate-300 rounded-md cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleNav('/signin')}
                  className="py-3 px-4 text-sm font-medium text-[#0B192C] border border-slate-300 rounded-md cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('/register')}
                  className="py-3 px-4 text-sm font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
