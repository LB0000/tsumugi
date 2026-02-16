import { Suspense, lazy, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Header, Sidebar, Footer, LoadingSpinner, ErrorBoundary } from './components/common';
import { getCurrentUser } from './api';
import { useAuthStore } from './stores/authStore';
import { config } from './config';
import { initGTM, trackPageView } from './lib/analytics';
import { injectJsonLd } from './lib/seo';
import { legalInfo } from './data/legal';
import { products } from './data/products';

// Code Splitting: ページコンポーネントを遅延読み込み
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));
const SupportPage = lazy(() => import('./pages/SupportPage').then(m => ({ default: m.SupportPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then(m => ({ default: m.LegalPage })));
const FaqPage = lazy(() => import('./pages/FaqPage').then(m => ({ default: m.FaqPage })));
const CartPage = lazy(() => import('./pages/CartPage').then(m => ({ default: m.CartPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const ResultPage = lazy(() => import('./pages/ResultPage').then(m => ({ default: m.ResultPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })));
const ShippingPage = lazy(() => import('./pages/ShippingPage').then(m => ({ default: m.ShippingPage })));
const ReturnsPage = lazy(() => import('./pages/ReturnsPage').then(m => ({ default: m.ReturnsPage })));
const CompanyPage = lazy(() => import('./pages/CompanyPage').then(m => ({ default: m.CompanyPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then(m => ({ default: m.AccountPage })));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));

const CATEGORY_PATHS = ['/pets', '/family', '/kids'];

function CheckoutErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">エラーが発生しました</h2>
        <p className="text-gray-600 mb-6">決済処理中にエラーが発生しました。</p>
        <a href="/cart" className="text-blue-600 hover:underline">カートに戻る</a>
      </div>
    </div>
  );
}

function ResultErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">エラーが発生しました</h2>
        <p className="text-gray-600 mb-6">結果の表示中にエラーが発生しました。</p>
        <a href="/" className="text-blue-600 hover:underline">トップに戻る</a>
      </div>
    </div>
  );
}

function PageErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">エラーが発生しました</h2>
        <p className="text-gray-600 mb-6">ページの表示中にエラーが発生しました。</p>
        <a href="/" className="text-blue-600 hover:underline">トップに戻る</a>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authUser, authLoading } = useAuthStore();
  const location = useLocation();
  if (authLoading) return <LoadingSpinner />;
  if (!authUser) return <Navigate to="/login" state={{ returnTo: location.pathname + location.search + location.hash }} replace />;
  return <>{children}</>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);
  useEffect(() => {
    const wasCategory = CATEGORY_PATHS.includes(prevPathname.current);
    const isCategory = CATEGORY_PATHS.includes(pathname);
    if (!(wasCategory && isCategory)) {
      window.scrollTo(0, 0);
    }
    prevPathname.current = pathname;
  }, [pathname]);
  return null;
}

function AnalyticsTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageView(pathname, document.title);
  }, [pathname]);
  return null;
}

function AppLayout() {
  const { setAuthSession, clearAuthSession } = useAuthStore();

  useEffect(() => {
    initGTM(config.gtmId);
  }, []);

  // Inject global JSON-LD structured data (Organization, WebSite, Product)
  useEffect(() => {
    const cleanups = [
      injectJsonLd('organization', {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: legalInfo['販売業者'],
        url: 'https://tsumugi.jp',
        logo: 'https://tsumugi.jp/images/ogp-default.jpg',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '神宮前1-2-3 アートビル5F',
          addressLocality: '渋谷区',
          addressRegion: '東京都',
          postalCode: '150-0001',
          addressCountry: 'JP',
        },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '03-1234-5678',
          email: legalInfo['メールアドレス'],
          contactType: 'customer service',
          availableLanguage: 'Japanese',
        },
      }),
      injectJsonLd('website', {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'TSUMUGI',
        url: 'https://tsumugi.jp',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://tsumugi.jp/faq?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      }),
      ...products.map((product) =>
        injectJsonLd(`product-${product.id}`, {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.description,
          url: 'https://tsumugi.jp/pricing',
          image: 'https://tsumugi.jp/images/ogp-default.jpg',
          brand: { '@type': 'Brand', name: 'TSUMUGI' },
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'JPY',
            availability: 'https://schema.org/InStock',
            url: 'https://tsumugi.jp/pricing',
            seller: { '@type': 'Organization', name: legalInfo['販売業者'] },
          },
        })
      ),
    ];
    return () => cleanups.forEach(fn => fn());
  }, []);

  useEffect(() => {
    let isCancelled = false;

    void getCurrentUser()
      .then((user) => {
        if (isCancelled) return;
        setAuthSession(user);
      })
      .catch(() => {
        if (isCancelled) return;
        clearAuthSession();
      });

    return () => {
      isCancelled = true;
    };
  }, [setAuthSession, clearAuthSession]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <Sidebar />
      <main className="flex-1 w-full">
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Navigate to="/pets" replace />} />
              <Route path="/pets" element={<ErrorBoundary fallback={<PageErrorFallback />}><HomePage /></ErrorBoundary>} />
              <Route path="/family" element={<ErrorBoundary fallback={<PageErrorFallback />}><HomePage /></ErrorBoundary>} />
              <Route path="/kids" element={<ErrorBoundary fallback={<PageErrorFallback />}><HomePage /></ErrorBoundary>} />
              <Route path="/result" element={<ErrorBoundary fallback={<ResultErrorFallback />}><ResultPage /></ErrorBoundary>} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/legal" element={<LegalPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/cart" element={<ErrorBoundary fallback={<PageErrorFallback />}><CartPage /></ErrorBoundary>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/checkout" element={<ErrorBoundary fallback={<CheckoutErrorFallback />}><CheckoutPage /></ErrorBoundary>} />
              <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
              <Route path="/shipping" element={<ShippingPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/company" element={<CompanyPage />} />
              <Route path="/account" element={<ErrorBoundary fallback={<PageErrorFallback />}><ProtectedRoute><AccountPage /></ProtectedRoute></ErrorBoundary>} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AnalyticsTracker />
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
