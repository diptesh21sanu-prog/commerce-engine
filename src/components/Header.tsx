import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Store, Shield, User as UserIcon, LogOut, ChevronDown, Globe, Heart } from 'lucide-react';

interface HeaderProps {
  currentView: 'storefront' | 'customer_dashboard' | 'seller_studio' | 'admin_console';
  onNavigate: (view: 'storefront' | 'customer_dashboard' | 'seller_studio' | 'admin_console') => void;
  onOpenAuthModal: () => void;
  onOpenCompare?: () => void;
  compareCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenAuthModal,
  onOpenCompare,
  compareCount = 0,
}) => {
  const { user, logout, quickLogin } = useAuth();
  const { currency, currencyInfo, setCurrency, availableCurrencies } = useCurrency();
  const { itemCount, openCart } = useCart();

  const [showDemoDropdown, setShowDemoDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#FBFBF9]/95 backdrop-blur-md border-b border-stone-200">
      {/* 3-Zone Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('storefront')}
            className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 hover:text-stone-700 transition-colors text-left"
          >
            Commerce Engine
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
          <button
            onClick={() => onNavigate('storefront')}
            className={`transition-colors whitespace-nowrap ${currentView === 'storefront' ? 'text-stone-900 font-semibold' : 'hover:text-stone-900'}`}
          >
            Shop
          </button>

          <button
            onClick={() => onNavigate('customer_dashboard')}
            className={`transition-colors whitespace-nowrap ${currentView === 'customer_dashboard' ? 'text-stone-900 font-semibold' : 'hover:text-stone-900'}`}
          >
            Orders & Wishlist
          </button>

          <button
            onClick={() => onNavigate('seller_studio')}
            className={`transition-colors whitespace-nowrap flex items-center gap-1.5 ${currentView === 'seller_studio' ? 'text-stone-900 font-semibold' : 'hover:text-stone-900'}`}
          >
            <Store className="w-4 h-4 text-stone-500" />
            <span>Seller Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('admin_console')}
            className={`transition-colors whitespace-nowrap flex items-center gap-1.5 ${currentView === 'admin_console' ? 'text-stone-900 font-semibold' : 'hover:text-stone-900'}`}
          >
            <Shield className="w-4 h-4 text-stone-500" />
            <span>Admin Dashboard</span>
          </button>
        </nav>

        {/* Zone 3: Actions, Currency Selector & Cart */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* CURRENCY SELECTOR */}
          <div className="relative">
            <button
              onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:border-stone-400 hover:bg-stone-50 transition-colors"
              title="Select Currency"
            >
              <Globe className="w-3.5 h-3.5 text-stone-500" />
              <span className="font-semibold text-stone-900">{currencyInfo.symbol} {currencyInfo.code}</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showCurrencyDropdown && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-stone-200 py-1.5 z-50 text-xs max-h-80 overflow-y-auto"
                onMouseLeave={() => setShowCurrencyDropdown(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                  Select Currency
                </div>
                {availableCurrencies.map((curr) => (
                  <button
                    key={curr.code}
                    onClick={() => {
                      setCurrency(curr.code);
                      setShowCurrencyDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center justify-between transition-colors ${
                      currency === curr.code ? 'bg-stone-50 font-bold text-stone-900' : 'text-stone-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono w-6 text-stone-900 font-bold">{curr.symbol}</span>
                      <span>{curr.name}</span>
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono">{curr.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* COMPARE BUTTON */}
          {compareCount > 0 && onOpenCompare && (
            <button
              onClick={onOpenCompare}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors"
            >
              <span>Compare ({compareCount})</span>
            </button>
          )}

          {/* SHOPPING CART ICON */}
          <button
            onClick={openCart}
            className="relative p-2 text-stone-700 hover:text-stone-900 rounded-md hover:bg-stone-100 transition-colors"
            aria-label="Open Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-stone-900 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>

          {/* QUICK PERSONA SWITCHER */}
          <div className="relative">
            <button
              onClick={() => setShowDemoDropdown(!showDemoDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:border-stone-400 hover:bg-stone-50 transition-colors whitespace-nowrap"
            >
              <UserIcon className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">
                {user ? (user.role === 'seller' ? user.seller?.store_name || 'Seller' : user.fullName.split(' ')[0]) : 'Guest'}
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showDemoDropdown && (
              <div 
                className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-stone-200 py-1.5 z-50 text-xs"
                onMouseLeave={() => setShowDemoDropdown(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                  Test Personas (1-Click Switch)
                </div>
                
                <button
                  onClick={async () => {
                    await quickLogin('customer');
                    setShowDemoDropdown(false);
                    onNavigate('storefront');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center justify-between text-stone-800"
                >
                  <div>
                    <div className="font-semibold">Customer (Liam Thorne)</div>
                    <div className="text-[11px] text-stone-500">Shop, cart, checkout, returns</div>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    await quickLogin('seller_krona');
                    setShowDemoDropdown(false);
                    onNavigate('seller_studio');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center justify-between text-stone-800"
                >
                  <div>
                    <div className="font-semibold">Seller: Krona Audio</div>
                    <div className="text-[11px] text-stone-500">Approved merchant · 8% commission</div>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    await quickLogin('seller_aethel');
                    setShowDemoDropdown(false);
                    onNavigate('seller_studio');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center justify-between text-stone-800"
                >
                  <div>
                    <div className="font-semibold">Seller: Aethel Ceramics</div>
                    <div className="text-[11px] text-stone-500">Approved merchant · 10% commission</div>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    await quickLogin('seller_velox');
                    setShowDemoDropdown(false);
                    onNavigate('seller_studio');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center justify-between text-stone-800"
                >
                  <div>
                    <div className="font-semibold">Seller: Velox Gear</div>
                    <div className="text-[11px] text-stone-500">Pending application to test admin approval</div>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    await quickLogin('admin');
                    setShowDemoDropdown(false);
                    onNavigate('admin_console');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center justify-between text-stone-800"
                >
                  <div>
                    <div className="font-semibold">Platform Admin (Eleanor)</div>
                    <div className="text-[11px] text-stone-500">Approve sellers, audit trail, stats</div>
                  </div>
                </button>

                {user && (
                  <div className="border-t border-stone-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setShowDemoDropdown(false);
                        onNavigate('storefront');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out (Return to Guest)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SIGN IN BUTTON */}
          {!user && (
            <button
              onClick={onOpenAuthModal}
              className="px-3 sm:px-4 py-1.5 text-xs font-medium text-white bg-stone-900 rounded-md hover:bg-stone-800 transition-colors whitespace-nowrap"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
