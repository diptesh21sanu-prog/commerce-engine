import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { CartProvider, useCart } from './context/CartContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Header } from './components/Header';
import { Storefront } from './components/Storefront';
import { CustomerDashboard } from './components/CustomerDashboard';
import { SellerStudio } from './components/SellerStudio';
import { AdminConsole } from './components/AdminConsole';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { CompareModal } from './components/CompareModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AiAssistant } from './components/AiAssistant';
import { Product } from './types';
import { api } from './services/api';

function MainApp() {
  const [currentView, setCurrentView] = useState<'storefront' | 'customer_dashboard' | 'seller_studio' | 'admin_console'>('storefront');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutCoupon, setCheckoutCoupon] = useState<string | undefined>(undefined);

  const [comparedProducts, setComparedProducts] = useState<Product[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [activeProductDetailId, setActiveProductDetailId] = useState<string | null>(null);

  const { addToCart } = useCart();
  const { showToast } = useToast();

  const handleToggleCompare = (product: Product) => {
    if (comparedProducts.some((p) => p.id === product.id)) {
      setComparedProducts(comparedProducts.filter((p) => p.id !== product.id));
    } else {
      if (comparedProducts.length >= 3) {
        showToast('You can compare a maximum of 3 products at a time.', 'info');
        return;
      }
      setComparedProducts([...comparedProducts, product]);
      setIsCompareModalOpen(true);
    }
  };

  const handleOpenCheckout = (couponCode?: string) => {
    setCheckoutCoupon(couponCode);
    setIsCheckoutModalOpen(true);
  };

  const handleBuyNowFromPDP = async (variantId: string, quantity: number) => {
    await addToCart(variantId, quantity);
    setIsCheckoutModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBF9] text-stone-900 font-sans selection:bg-stone-900 selection:text-white">
      {/* Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenCompare={() => setIsCompareModalOpen(true)}
        compareCount={comparedProducts.length}
      />

      {/* Main Views */}
      <div className="flex-1">
        {currentView === 'storefront' && (
          <Storefront
            onOpenCheckoutWithItem={handleBuyNowFromPDP}
            onOpenCompare={() => setIsCompareModalOpen(true)}
            comparedProducts={comparedProducts}
            onToggleCompare={handleToggleCompare}
            onSelectProductDetail={(productId) => setActiveProductDetailId(productId)}
          />
        )}
        {currentView === 'customer_dashboard' && <CustomerDashboard />}
        {currentView === 'seller_studio' && <SellerStudio />}
        {currentView === 'admin_console' && <AdminConsole />}
      </div>

      {/* Global Slide-Over Cart Drawer */}
      <CartDrawer onProceedToCheckout={handleOpenCheckout} />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        couponCode={checkoutCoupon}
        onOrderCompleted={(orderId) => {
          setCurrentView('customer_dashboard');
        }}
      />

      {/* Compare Modal */}
      <CompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        products={comparedProducts}
        onRemove={(id) => setComparedProducts(comparedProducts.filter((p) => p.id !== id))}
        onClear={() => setComparedProducts([])}
      />

      {/* Product Detail Modal */}
      {activeProductDetailId && (
        <ProductDetailModal
          productIdOrSlug={activeProductDetailId}
          onClose={() => setActiveProductDetailId(null)}
          onBuyNow={handleBuyNowFromPDP}
          onToggleWishlist={async (productId) => {
            try {
              await api.toggleWishlist(productId);
              showToast('Wishlist updated', 'success');
            } catch (err) {
              showToast('Please sign in to save items to your wishlist.', 'info');
            }
          }}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* AI Shopping Assistant Widget */}
      <AiAssistant
        onSelectProduct={(productId) => {
          setActiveProductDetailId(productId);
        }}
      />

      {/* Clean Footer in Plain English */}
      <footer className="border-t border-stone-200 bg-white py-12 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="text-sm font-bold text-stone-900 mb-1">Commerce Engine</div>
            <p className="text-stone-500 max-w-sm">
              Independent multi-vendor marketplace with server-verified prices, multi-currency support, and guaranteed stock reservations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-stone-600 font-medium">
            <button onClick={() => setCurrentView('storefront')} className="hover:text-stone-900">
              Shop
            </button>
            <button onClick={() => setCurrentView('customer_dashboard')} className="hover:text-stone-900">
              Orders & Account
            </button>
            <button onClick={() => setCurrentView('seller_studio')} className="hover:text-stone-900">
              Seller Dashboard
            </button>
            <button onClick={() => setCurrentView('admin_console')} className="hover:text-stone-900">
              Admin Dashboard
            </button>
          </div>

          <div className="text-stone-400 font-mono text-[11px]">
            Server-Authoritative Pricing · Multi-Currency
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <CurrencyProvider>
        <AuthProvider>
          <CartProvider>
            <MainApp />
          </CartProvider>
        </AuthProvider>
      </CurrencyProvider>
    </ToastProvider>
  );
}
