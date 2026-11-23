import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Download, Globe, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import type { Announcement, FaqItem } from '../types.ts';
import { SUPPORTED_COUNTRIES } from '../utils/currency.ts';

export function HowItWorksPage() {
  const { navigate } = useApp();

  const stages = [
    {
      num: '01',
      title: 'Explore',
      detail:
        'Browse curated sample products spanning Cars and Vehicles, Houses and Properties, Smartphones, Computers and Laptops, Electronics, Home Appliances, Furniture, and Lifestyle Accessories.',
    },
    {
      num: '02',
      title: 'Learn',
      detail:
        'Open each dedicated product page to inspect multi-angle commercial photographs, full technical specifications, estimated market value across supported currencies (GHS, USD, GBP, CAD), delivery scope, and eligibility requirements.',
    },
    {
      num: '03',
      title: 'Participate (When Legally Approved)',
      detail:
        'Under RENORA’s proposed business model, customers would access low-cost entry opportunities only after all required legal advice, operating licenses, and regulatory approvals have been formally obtained for that country.',
    },
    {
      num: '04',
      title: 'Results & Verified Delivery',
      detail:
        'Once an approved campaign closes, verified outcomes, winner notices, and product handover documentation will be published transparently according to local regulatory standards.',
    },
  ];

  return (
    <div className="bg-white pb-20">
      <section className="bg-[#0B192C] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 max-w-3xl">
          <p className="text-xs font-semibold tracking-wider text-[#D9B15C] uppercase">
            Proposed Operating Architecture
          </p>
          <h1 className="font-editorial text-3xl sm:text-5xl font-semibold text-white">
            How RENORA Works
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">
            More Possibilities, Less Spending. Understand how our international showcase and future opportunity platform is structured—and why compliance comes first.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
        <div className="p-6 bg-[#F9F3E3] border border-[#C69736]/40 rounded-lg flex items-start gap-4">
          <Lock className="w-5 h-5 text-[#9A721C] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1 text-sm text-[#0B192C]">
            <p className="font-semibold">Supported Payment Methods & Compliance</p>
            <p className="text-slate-700 leading-relaxed">
              RENORA supports ticket checkout via Visa cards, Bank Transfers, Ghana Mobile Money (MTN, Vodafone, and Tigo), and PayPal. All ticket orders are priced and verified server-side, and operations remain subject to local legal requirements in each market.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {stages.map((stage) => (
            <div key={stage.num} className="p-8 border border-slate-200 rounded-lg bg-[#F7F8FA] space-y-3">
              <span className="font-mono text-sm font-semibold text-[#9A721C] tabular-nums">
                {stage.num}.
              </span>
              <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">{stage.title}</h2>
              <p className="text-sm text-slate-700 leading-relaxed">{stage.detail}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#132642] rounded-md cursor-pointer"
          >
            <span>Explore Sample Catalog</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/legal/responsible-participation')}
            className="px-6 py-3 text-sm font-semibold text-[#0B192C] border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
          >
            Read Draft Participation Policy
          </button>
        </div>
      </section>
    </div>
  );
}

export function AboutPage() {
  const { navigate } = useApp();

  return (
    <div className="bg-white pb-20">
      <section className="bg-[#0B192C] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <p className="text-xs font-semibold tracking-wider text-[#D9B15C] uppercase">
            About RENORA
          </p>
          <h1 className="font-editorial text-3xl sm:text-5xl font-semibold text-white max-w-3xl">
            More Possibilities, Less Spending.
          </h1>
          <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
            RENORA is an international product and lifestyle platform built to make high-value vehicles, homes, technology, and everyday essentials more accessible—starting in Ghana and scaling across global markets.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7 space-y-5 text-slate-700 text-sm sm:text-base leading-relaxed">
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#0B192C]">
              Built with International Standards from Day One
            </h2>
            <p>
              RENORA is not a single-category electronics shop. Our vision spans eight diverse product categories: Cars and Vehicles, Houses and Properties, Smartphones, Computers and Laptops, Electronics, Home Appliances, Furniture, and Lifestyle Accessories.
            </p>
            <p>
              Starting with an initial operational focus in Ghana, the platform is engineered to support multiple currencies (GHS, USD, GBP, CAD), localized delivery disclosures, and jurisdiction-aware eligibility rules so that expansion into the United States, the United Kingdom, Canada, and other markets happens responsibly.
            </p>
            <p>
              In this foundational release, RENORA concentrates on brand clarity, verified sample product presentation, secure customer accounts, administrative catalog management, and transparent legal draft documentation. We make no premature claims regarding corporate registration, lottery licensing, or active prize draws.
            </p>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-[#F7F8FA] border border-slate-200 rounded-lg space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0B192C]">
                <Globe className="w-4 h-4 text-[#9A721C]" aria-hidden="true" />
                <span>Planned Market Roadmap</span>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-700">
                <li className="flex justify-between border-b border-slate-200 pb-2">
                  <span>Ghana (Initial Launch Market)</span>
                  <span className="font-mono text-xs text-[#9A721C]">GHS</span>
                </li>
                <li className="flex justify-between border-b border-slate-200 pb-2">
                  <span>United States</span>
                  <span className="font-mono text-xs text-slate-500">USD</span>
                </li>
                <li className="flex justify-between border-b border-slate-200 pb-2">
                  <span>United Kingdom</span>
                  <span className="font-mono text-xs text-slate-500">GBP</span>
                </li>
                <li className="flex justify-between">
                  <span>Canada & International</span>
                  <span className="font-mono text-xs text-slate-500">CAD / USD</span>
                </li>
              </ul>
            </div>

            <div className="p-6 bg-[#0B192C] text-white rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#D9B15C]">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>Complete Source Code Package</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Download the full RENORA web application source code, database setup, and beginner-friendly README installation guide as a ZIP archive.
              </p>
              <a
                href="/api/download-project"
                download="renora-website-source.zip"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#0B192C] bg-[#D9B15C] hover:bg-[#C69736] rounded-md transition-colors"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Download Complete Project (ZIP)</span>
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => navigate('/contact')}
            className="px-6 py-3 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#132642] rounded-md cursor-pointer"
          >
            Contact the RENORA Team
          </button>
          <button
            type="button"
            onClick={() => navigate('/faq')}
            className="px-6 py-3 text-sm font-semibold text-[#0B192C] border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
          >
            View FAQ & Announcements
          </button>
        </div>
      </section>
    </div>
  );
}

export function ContactPage() {
  const { user, selectedCountry } = useApp();
  const [name, setName] = useState(user ? `${user.first_name} ${user.last_name}`.trim() : '');
  const [email, setEmail] = useState(user?.email || '');
  const [country, setCountry] = useState(user?.country || selectedCountry || 'Ghana');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, country, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send message.');
      } else {
        setSuccess(data.message);
        setSubject('');
        setMessage('');
      }
    } catch {
      setError('Network error while sending your message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F7F8FA] pb-20">
      <section className="bg-[#0B192C] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold tracking-wider text-[#D9B15C] uppercase">
            Get in Touch
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-white">
            Contact RENORA
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
            Questions about our product showcase, account support, international partnerships, or compliance framework? Send us a direct inquiry.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-white border border-slate-200 rounded-lg space-y-4">
              <div className="flex items-center gap-2.5 text-[#0B192C] font-semibold">
                <Mail className="w-5 h-5 text-[#9A721C]" aria-hidden="true" />
                <span>Support & Regional Desks</span>
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <div>
                  <p className="font-semibold text-[#0B192C]">Initial Market Focus</p>
                  <p>Accra & Nationwide Logistics Planning, Ghana</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0B192C]">International Expansion Desk</p>
                  <p>United States · United Kingdom · Canada</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0B192C]">Response Expectations</p>
                  <p>All inquiries submitted here are logged directly to the RENORA administration inbox.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-5">
              <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">
                Send an Inquiry
              </h2>

              {error && (
                <div className="p-3.5 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-country" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                    Country / Region
                  </label>
                  <select
                    id="contact-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0B192C]"
                  >
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                    Subject
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Account, product info, or regional inquiry"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#132642] rounded-md transition-colors disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Sending Inquiry...' : 'Submit Inquiry'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

export function FaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/faqs')
      .then((r) => r.json())
      .then((d) => {
        setFaqs(d.faqs || []);
        setOpenId(d.faqs?.[0]?.id ?? null);
      })
      .catch(() => {});

    fetch('/api/announcements')
      .then((r) => r.json())
      .then((d) => setAnnouncements(d.announcements || []))
      .catch(() => {});
  }, []);

  return (
    <div className="bg-[#F7F8FA] pb-20">
      <section className="bg-[#0B192C] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold tracking-wider text-[#D9B15C] uppercase">
            Help & Official Updates
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-white">
            Frequently Asked Questions & Announcements
          </h1>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">
            Platform Questions
          </h2>
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
            {faqs.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div key={faq.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 cursor-pointer"
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

        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-editorial text-2xl font-semibold text-[#0B192C]">
            Verified Announcements
          </h2>
          <div className="space-y-4">
            {announcements.map((item) => (
              <article key={item.id} className="p-6 bg-white border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-[#9A721C]">{item.market_scope}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{item.published_at.slice(0, 10)}</span>
                </div>
                <h3 className="text-base font-semibold text-[#0B192C]">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
