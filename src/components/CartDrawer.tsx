import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag } from 'lucide-react';

interface CartDrawerProps {
  onProceedToCheckout: (couponCode?: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onProceedToCheckout }) => {
  const { cart, isCartOpen, closeCart, updateQuantity, removeItem } = useCart();
  const { formatMoney } = useCurrency();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  if (!isCartOpen) return null;

  const items = cart?.items || [];
  const subtotalCents = cart?.subtotalCents || 0;

  const handleApplyCoupon = (codeToApply: string) => {
    setAppliedCoupon(codeToApply.toUpperCase());
    setCouponCode(codeToApply.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-stone-700" />
              <h2 className="text-sm font-bold text-stone-900">Your Cart ({cart?.itemCount || 0})</h2>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium text-stone-700">Your cart is empty</p>
                <p className="text-xs text-stone-400 mt-1">Discover handcrafted goods in our catalog</p>
                <button
                  onClick={closeCart}
                  className="mt-4 px-4 py-2 text-xs font-medium text-stone-900 bg-stone-100 rounded-md hover:bg-stone-200 transition-colors"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex gap-3 pb-4 border-b border-stone-100 last:border-none">
                  <img
                    src={item.image_url || `/api/v1/images/products/${item.product_id}`}
                    alt={item.product_title}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 object-cover rounded-md bg-stone-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-stone-400 font-medium truncate">{item.seller_name}</div>
                    <div className="text-xs font-semibold text-stone-900 truncate">{item.product_title}</div>
                    <div className="text-[11px] text-stone-500 mb-2 truncate">{item.variant_title}</div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-stone-900 tabular-nums">
                        {formatMoney(item.price_cents * item.quantity)}
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-stone-300 rounded">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-stone-100 text-stone-600 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-semibold tabular-nums text-stone-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-stone-100 text-stone-600 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-stone-400 hover:text-red-600 p-1 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="p-4 border-t border-stone-200 bg-[#FAF9F7] space-y-3">
              {/* Coupon Bar */}
              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Coupon Code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-xs border border-stone-300 rounded bg-white font-mono uppercase"
                    />
                  </div>
                  <button
                    onClick={() => handleApplyCoupon(couponCode)}
                    disabled={!couponCode.trim()}
                    className="px-3 py-1.5 text-xs font-medium bg-stone-900 text-white rounded hover:bg-stone-800 disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>

                {/* Instant Coupon Chips */}
                <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                  <span className="text-stone-400">Available:</span>
                  <button
                    onClick={() => handleApplyCoupon('WELCOME20')}
                    className="px-1.5 py-0.5 border border-dashed border-stone-300 rounded hover:border-stone-500 font-mono text-stone-600"
                  >
                    WELCOME20 (20% off)
                  </button>
                  <button
                    onClick={() => handleApplyCoupon('SAVE10')}
                    className="px-1.5 py-0.5 border border-dashed border-stone-300 rounded hover:border-stone-500 font-mono text-stone-600"
                  >
                    SAVE10 ($10 off)
                  </button>
                </div>
                {appliedCoupon && (
                  <div className="text-[11px] text-emerald-700 mt-1 font-medium">
                    ✓ Coupon code {appliedCoupon} will be verified and deducted at checkout.
                  </div>
                )}
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-200">
                <span className="text-stone-600">Subtotal</span>
                <span className="text-sm font-bold text-stone-900 tabular-nums">
                  {formatMoney(subtotalCents)}
                </span>
              </div>
              <div className="text-[11px] text-stone-400">
                Taxes and shipping calculated at checkout.
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => {
                  closeCart();
                  onProceedToCheckout(appliedCoupon || undefined);
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-stone-900 rounded-md hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
