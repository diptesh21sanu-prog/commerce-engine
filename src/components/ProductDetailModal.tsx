import React, { useState, useEffect } from 'react';
import { Product, ProductVariant } from '../types';
import { api } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { X, Check, ShieldCheck, Truck, RotateCcw, Heart, Plus, Minus, ShoppingBag, Star, Share2 } from 'lucide-react';
import { getCategoryFallbackImage } from '../utils/imageFallback';

interface ProductDetailModalProps {
  productIdOrSlug: string;
  onClose: () => void;
  onBuyNow?: (variantId: string, quantity: number) => void;
  onToggleWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  productIdOrSlug,
  onClose,
  onBuyNow,
  onToggleWishlist,
  isWishlisted = false,
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addedMessage, setAddedMessage] = useState(false);

  const { formatMoney } = useCurrency();
  const { addToCart } = useCart();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.getProduct(productIdOrSlug)
      .then((data) => {
        if (isMounted) {
          setProduct(data);
          if (data.variants && data.variants.length > 0) {
            setSelectedVariant(data.variants[0]);
          }
          if (data.primary_image) {
            setSelectedImage(data.primary_image);
          } else if (data.images && data.images.length > 0) {
            setSelectedImage(data.images[0].url);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load product details:', err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [productIdOrSlug]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs">
        <div className="bg-white p-6 rounded-lg shadow-xl text-xs text-stone-600">
          Loading product information...
        </div>
      </div>
    );
  }

  if (!product) return null;

  const currentPriceCents = selectedVariant ? selectedVariant.price_cents : product.min_price_cents;
  const availableStock = selectedVariant?.available_qty ?? product.total_available_stock;
  const isOutOfStock = availableStock <= 0;

  const handleAddToCart = async () => {
    if (!selectedVariant || isOutOfStock) return;
    await addToCart(selectedVariant.id, quantity);
    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 2000);
  };

  const handleBuyNow = () => {
    if (!selectedVariant || isOutOfStock) return;
    if (onBuyNow) {
      onBuyNow(selectedVariant.id, quantity);
    } else {
      addToCart(selectedVariant.id, quantity);
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-stone-400 hover:text-stone-700 bg-white/90 rounded-full shadow-xs transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Gallery Left */}
            <div className="bg-[#F8F8F7] p-6 sm:p-8 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-stone-200">
              <div className="w-full aspect-[4/3] flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm mb-4">
                <img
                  src={selectedImage || product.primary_image || `/api/v1/images/products/${product.id}`}
                  alt={product.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getCategoryFallbackImage(product.category_slug || product.category_name);
                  }}
                  className="w-full h-full object-contain p-2"
                />
              </div>

              {/* Thumbnails */}
              <div className="flex items-center gap-2 overflow-x-auto w-full py-1">
                {(product.images && product.images.length > 0
                  ? product.images.map((im) => im.url)
                  : [
                      product.primary_image || `/api/v1/images/products/${product.id}`,
                      `/api/v1/images/products/${product.id}-detail`,
                    ]
                ).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                      (selectedImage === img || (!selectedImage && idx === 0)) ? 'border-stone-900' : 'border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <img
                      src={img}
                      alt="thumbnail"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getCategoryFallbackImage(product.category_slug || product.category_name);
                      }}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Details & Purchase Module Right */}
            <div className="p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                  <span className="font-semibold text-stone-900">{product.brand || product.seller_name}</span>
                  <div className="flex items-center gap-1 text-amber-600 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{product.avg_rating ? product.avg_rating.toFixed(1) : '5.0'}</span>
                    <span className="text-stone-400">({product.review_count || 12} reviews)</span>
                  </div>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 mb-2">
                  {product.title}
                </h1>

                {/* Price in Selected Currency */}
                <div className="text-2xl font-bold text-stone-900 mb-4 tabular-nums">
                  {formatMoney(currentPriceCents)}
                </div>

                <p className="text-xs text-stone-600 leading-relaxed mb-6">
                  {product.description}
                </p>

                {/* Variant Selector */}
                {product.variants && product.variants.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-stone-800 mb-2">
                      Choose Variant:
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {product.variants.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`text-left p-3 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                            selectedVariant?.id === v.id
                              ? 'border-stone-900 bg-stone-50 font-medium'
                              : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <div>
                            <div className="text-stone-900">{v.title}</div>
                            <div className="text-[10px] text-stone-400 font-mono mt-0.5">SKU: {v.sku}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold tabular-nums text-stone-900">{formatMoney(v.price_cents)}</div>
                            <div className={`text-[10px] ${((v.available_qty || 0) <= 3) ? 'text-amber-700 font-medium' : 'text-stone-400'}`}>
                              {((v.available_qty || 0) > 0) ? `${v.available_qty} in stock` : 'Out of stock'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Stock Indicator */}
                <div className="flex items-center gap-2 text-xs mb-6">
                  <span className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  <span className="text-stone-700 font-medium">
                    {isOutOfStock ? 'Currently out of stock' : `In Stock: ${availableStock} units available`}
                  </span>
                </div>

                {/* Quantity Selector */}
                {!isOutOfStock && (
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-xs text-stone-600 font-medium">Quantity:</span>
                    <div className="flex items-center border border-stone-300 rounded-md">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 text-stone-600 hover:bg-stone-100 transition-colors"
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold tabular-nums text-stone-900">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                        className="p-2 text-stone-600 hover:bg-stone-100 transition-colors"
                        disabled={quantity >= availableStock}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={isOutOfStock}
                    onClick={handleAddToCart}
                    className="w-full py-3 px-4 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    {addedMessage ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Added to Cart</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Add to Cart</span>
                      </>
                    )}
                  </button>

                  <button
                    disabled={isOutOfStock}
                    onClick={handleBuyNow}
                    className="w-full py-3 px-4 text-xs font-semibold rounded-lg bg-stone-900 hover:bg-stone-800 text-white transition-colors shadow-sm disabled:opacity-40"
                  >
                    Buy Now
                  </button>
                </div>

                {onToggleWishlist && (
                  <button
                    onClick={() => onToggleWishlist(product.id)}
                    className="w-full py-2 text-xs font-medium text-stone-600 hover:text-stone-900 flex items-center justify-center gap-1.5"
                  >
                    <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                    <span>{isWishlisted ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
                  </button>
                )}

                {/* Delivery & Returns Trust Badges */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-stone-100 text-[11px] text-stone-500 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Truck className="w-4 h-4 text-stone-600" />
                    <span>Tracked Delivery</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <RotateCcw className="w-4 h-4 text-stone-600" />
                    <span>14-Day Returns</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-stone-600" />
                    <span>Verified Merchant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Verified Customer Reviews */}
          {product.reviews && product.reviews.length > 0 && (
            <div className="p-6 sm:p-8 bg-stone-50 border-t border-stone-200">
              <h3 className="text-sm font-bold text-stone-900 mb-4">
                Customer Reviews ({product.reviews.length})
              </h3>
              <div className="space-y-4">
                {product.reviews.map((r) => (
                  <div key={r.id} className="bg-white p-4 rounded-xl border border-stone-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-stone-800">{r.author_name}</span>
                      <div className="flex items-center gap-1 text-amber-600">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{r.rating}/5</span>
                      </div>
                    </div>
                    <div className="font-semibold text-stone-700 mb-1">{r.title}</div>
                    <p className="text-stone-500 leading-relaxed">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
