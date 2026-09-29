import React from 'react';
import { Product } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { X, ArrowRight, Check, ShoppingBag } from 'lucide-react';
import { getCategoryFallbackImage } from '../utils/imageFallback';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRemove: (productId: string) => void;
  onClear: () => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  products,
  onRemove,
  onClear,
}) => {
  const { formatMoney } = useCurrency();
  const { addToCart } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-stone-200 p-6 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h2 className="text-base font-bold text-stone-900">Compare Products ({products.length}/3)</h2>
            <p className="text-xs text-stone-500">Side-by-side comparison of specifications, stock, and pricing.</p>
          </div>
          <div className="flex items-center gap-3">
            {products.length > 0 && (
              <button onClick={onClear} className="text-xs text-stone-500 hover:text-stone-900">
                Clear All
              </button>
            )}
            <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            No products selected for comparison. Click "Compare" on any product card or details view.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <div className="grid grid-cols-3 gap-6 text-xs">
              {products.map((p) => (
                <div key={p.id} className="border border-stone-200 rounded-lg p-4 bg-white flex flex-col justify-between">
                  <div>
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => onRemove(p.id)}
                        className="text-stone-400 hover:text-red-600 p-1"
                        title="Remove from comparison"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <img
                      src={p.primary_image || `/api/v1/images/products/${p.id}`}
                      alt={p.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getCategoryFallbackImage(p.category_slug || p.category_name);
                      }}
                      className="w-full aspect-[4/3] object-cover rounded mb-3 bg-stone-100"
                    />

                    <div className="text-[11px] text-stone-400 font-medium">{p.brand} · {p.category_name}</div>
                    <h3 className="text-sm font-semibold text-stone-900 mb-2">{p.title}</h3>

                    <div className="text-base font-bold text-stone-900 mb-4 tabular-nums">
                      {formatMoney(p.min_price_cents)}
                    </div>

                    <div className="space-y-2 border-t border-stone-100 pt-3 text-stone-600">
                      <div className="flex justify-between">
                        <span className="text-stone-400">Stock Status:</span>
                        <span className="font-medium text-stone-800">
                          {p.total_available_stock > 0 ? `${p.total_available_stock} available` : 'Out of Stock'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">Merchant:</span>
                        <span className="font-medium text-stone-800">{p.seller_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">Rating:</span>
                        <span className="font-medium text-stone-800">{p.avg_rating ? `${p.avg_rating}/5` : '5.0/5'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">Variants:</span>
                        <span className="font-medium text-stone-800">{p.variant_count} editions</span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={p.total_available_stock <= 0}
                    onClick={() => {
                      // Add default variant to cart
                      const defaultVar = p.variants?.[0]?.id || `var-${p.id.replace('prod-', '')}-a`;
                      addToCart(defaultVar, 1);
                      onClose();
                    }}
                    className="mt-6 w-full py-2 bg-stone-900 text-white rounded text-xs font-semibold hover:bg-stone-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add to Bag</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
