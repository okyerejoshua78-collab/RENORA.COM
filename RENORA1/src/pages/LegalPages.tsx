import React from 'react';
import { Scale } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

function DraftLegalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { navigate } = useApp();

  return (
    <div className="bg-white pb-20">
      <section className="bg-[#0B192C] text-white py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="text-xs font-semibold tracking-wider text-[#D9B15C] uppercase">
            Draft Legal Document — Subject to Legal Counsel Review
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-white">{title}</h1>
          <p className="text-sm text-slate-300">{subtitle}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        <div className="p-5 bg-[#F9F3E3] border border-[#C69736]/50 rounded-lg flex items-start gap-3 text-sm text-[#0B192C]">
          <Scale className="w-5 h-5 text-[#9A721C] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold">Draft Status Notice</p>
            <p className="text-slate-700 mt-1 leading-relaxed">
              This document is a structured draft template prepared for review, customization, and formal approval by qualified legal counsel in Ghana and every international market prior to commercial launch.
            </p>
          </div>
        </div>

        <div className="space-y-6 text-sm sm:text-base text-slate-700 leading-relaxed">
          {children}
        </div>

        <div className="pt-8 border-t border-slate-200 flex flex-wrap gap-4 text-xs font-semibold">
          <button type="button" onClick={() => navigate('/legal/privacy')} className="text-[#0B192C] hover:text-[#9A721C] cursor-pointer">
            Privacy Policy (Draft)
          </button>
          <button type="button" onClick={() => navigate('/legal/terms')} className="text-[#0B192C] hover:text-[#9A721C] cursor-pointer">
            Terms and Conditions (Draft)
          </button>
          <button type="button" onClick={() => navigate('/legal/responsible-participation')} className="text-[#0B192C] hover:text-[#9A721C] cursor-pointer">
            Responsible Participation (Draft)
          </button>
        </div>
      </div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <DraftLegalShell
      title="Privacy Policy (Draft)"
      subtitle="Prepared with Ghana Data Protection Act, 2012 (Act 843) and international privacy standards in mind."
    >
      <section className="space-y-2">
        <h2 className="font-editorial text-xl font-semibold text-[#0B192C]">1. Scope & Data Controller Notice</h2>
        <p>
          This draft Privacy Policy explains how RENORA intends to collect, process, store, and safeguard personal data when users register accounts, manage preferences, or contact support. Prior to launch, full corporate entity details, registered office address, and Data Protection Commission (Ghana) registration details will be inserted upon legal review.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-editorial text-xl font-semibold text-[#0B192C]">2. Data Minimization & Information Collected</h2>
        <p>
          RENORA collects only the personal information strictly necessary to operate customer accounts and issue entry tickets: first name, last name, email address, country of residence, optional phone number, preferred currency, order references, and encrypted credential hashes. Raw Visa card numbers and CVVs are never collected or stored on RENORA servers—card payments and PayPal transactions are handled through hosted payment gateways, while bank and Ghana Mobile Money transfers record only transfer references.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-editorial text-xl font-semibold text-[#0B192C]">3. Ghanaian & International Privacy Alignment</h2>
        <p>
          Data processing practices are designed to align with the principles of the Ghana Data Protection Act, 2012 (Act 843)—including accountability, lawfulness, purpose specification, data quality, openness, and security safeguards—as well as applicable international frameworks such as UK/EU GDPR, PIPEDA (Canada), and US state privacy laws where relevant.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-editorial text-xl font-semibold text-[#0B192C]">4. Security Safeguards & User Rights</h2>
        <p>
          Passwords are protected using salted cryptographic hashing (`scrypt`), never stored in plain text. Registered users may view, update, or request deletion of their profile data, verify or change account credentials, and contact RENORA regarding any privacy questions.
        </p>
      </section>
    </DraftLegalShell>
  );
}

export function TermsPage() {
  return (
    <DraftLegalShell
      title="Terms and Conditions (Draft)"
      subtitle="Draft platform governance terms for review by qualified legal counsel before commercial operations."
    >
      <section className="space-y-2">
        <h2 className="font-editorial text-xl font-semibold text-[#0B192C]">1. Showcase-Only Status</h2>
        <p>
          This website currently operates solely as an informational showcase and customer account registration preview. Nothing on this website constitutes a live lottery, prize draw, raffle, financial solicitation, or binding offer to sell goods or award prizes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-editorial text-xl font-semibold text-[#0B192C]">2. Ticket Orders & Payment Verification</h2>
        <p>
          Ticket purchases may be submitted via Visa cards, Bank Transfers, Ghana Mobile Money (MTN, Vodafone, and Tigo), or PayPal. Orders completed via hosted payment gateways are verified server-side, while manual Bank and Mobile Money transfers remain pending until verified and approved by RENORA administrators.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-editorial text-xl font-semibold text-[#0B192C]">3. Sample Product Information</h2>
        <p>
          All products, valuations, images, specifications, and delivery examples shown on the platform are illustrative samples. Currency conversions (GHS, USD, GBP, CAD) are indicative estimates for multi-market demonstration.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-editorial text-xl font-semibold text-[#0B192C]">4. Account Responsibilities & International Availability</h2>
        <p>
          Customers are responsible for maintaining accurate account information and safeguarding their login passwords. Future campaigns, if and when legally authorized, will be restricted strictly to jurisdictions where RENORA holds valid regulatory approval.
        </p>
      </section>
    </DraftLegalShell>
  );
}

export function ResponsibleParticipationPage() {
  return (
    <DraftLegalShell
      title="Responsible Participation Policy (Draft)"
      subtitle="Draft consumer protection standards governing any future legally approved offerings."
    >
      <section className="space-y-2">
        <h2 className="font-editorial text-xl font-semibold text-[#0B192C]">1. Legal Approval Prerequisite</h2>
        <p>
          RENORA’s core principle is that customer trust requires full statutory compliance. No participatory campaign will be opened in Ghana, the United States, the United Kingdom, Canada, or any other jurisdiction without formal licensing or legal confirmation of permissibility.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-editorial text-xl font-semibold text-[#0B192C]">2. Affordability & Clear Rules</h2>
        <p>
          When future offerings are approved, RENORA intends to publish clear entry caps, plain-language eligibility criteria, total odds disclosures where applicable, and strict age-verification requirements prior to accepting any participation.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-editorial text-xl font-semibold text-[#0B192C]">3. Transparent Fulfillment & Support</h2>
        <p>
          Every future campaign must be backed by verifiable product provenance, independent valuation records, and clear delivery or title-transfer timelines communicated before participation opens.
        </p>
      </section>
    </DraftLegalShell>
  );
}
