import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ExplorePage } from './pages/ExplorePage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { AboutPage, ContactPage, FaqPage, HowItWorksPage } from './pages/InfoPages.tsx';
import { PrivacyPolicyPage, ResponsibleParticipationPage, TermsPage } from './pages/LegalPages.tsx';
import {
  ForgotPasswordPage,
  RegisterPage,
  ResetPasswordPage,
  SignInPage,
  VerifyEmailPage,
} from './pages/AuthPages.tsx';
import { CustomerDashboardPage } from './pages/CustomerDashboardPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { CheckoutCallbackPage } from './pages/CheckoutCallbackPage.tsx';

function RouterView() {
  const { route, navigate } = useApp();
  const path = route.split('?')[0] || '/';

  if (path === '/') {
    return <HomePage />;
  }
  if (path === '/products') {
    return <ExplorePage />;
  }
  if (path === '/categories') {
    return <ExplorePage categoriesView />;
  }
  if (path.startsWith('/category/')) {
    const slug = decodeURIComponent(path.slice('/category/'.length));
    return <ExplorePage initialCategorySlug={slug} />;
  }
  if (path.startsWith('/product/')) {
    const slug = decodeURIComponent(path.slice('/product/'.length));
    return <ProductDetailPage slug={slug} />;
  }
  if (path === '/how-it-works') {
    return <HowItWorksPage />;
  }
  if (path === '/about') {
    return <AboutPage />;
  }
  if (path === '/contact') {
    return <ContactPage />;
  }
  if (path === '/faq') {
    return <FaqPage />;
  }
  if (path === '/legal/privacy') {
    return <PrivacyPolicyPage />;
  }
  if (path === '/legal/terms') {
    return <TermsPage />;
  }
  if (path === '/legal/responsible-participation') {
    return <ResponsibleParticipationPage />;
  }
  if (path === '/signin') {
    return <SignInPage />;
  }
  if (path === '/register') {
    return <RegisterPage />;
  }
  if (path === '/forgot-password') {
    return <ForgotPasswordPage />;
  }
  if (path === '/reset-password') {
    return <ResetPasswordPage />;
  }
  if (path === '/verify-email') {
    return <VerifyEmailPage />;
  }
  if (path === '/dashboard') {
    return <CustomerDashboardPage />;
  }
  if (path === '/admin') {
    return <AdminDashboardPage />;
  }
  if (path === '/checkout/callback') {
    return <CheckoutCallbackPage />;
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
      <h1 className="font-editorial text-3xl font-semibold text-[#0B192C]">Page Not Found</h1>
      <p className="text-sm text-slate-600">
        The page you requested does not exist on the RENORA platform.
      </p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
      >
        Return Home
      </button>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen flex flex-col bg-white text-[#0B192C]">
        <Navbar />
        <main className="flex-1">
          <RouterView />
        </main>
        <Footer />
      </div>
    </AppProvider>
  );
}
