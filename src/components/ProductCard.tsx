import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Heart, BarChart2, Star } from 'lucide-react';
import { getCategoryFallbackImage } from '../utils/imageFallback';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onToggleWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
  onToggleCompare?: (product: Product) => void;
  isCompared?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onToggleWishlist,
  isWishlisted = false,
  onToggleCompare,
  isCompared = false,
}) => {
  const { formatMoney } = useCurrency();
  const { addToCart } = useCart();

  const [imgSrc, setImgSrc] = useState(product.primary_image || `/api/v1/images/products/${product.id}`);

  useEffect(() => {
    setImgSrc(product.primary_image || `/api/v1/images/products/${product.id}`);
  }, [product.id, product.primary_image]);

  const isLowStock = product.total_available_stock > 0 && product.total_available_stock <= 3;
  const isOutOfStock = product.total_available_stock <= 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultVarId = product.variants?.[0]?.id || `var-${product.id.replace('prod-', '')}-a`;
    addToCart(defaultVarId, 1);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWishlist?.(product.id);
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCompare?.(product);
  };

  return (
    <article
      onClick={() => onSelect(product)}
      className="group cursor-pointer flex flex-col bg-white rounded-xl border border-stone-200 overflow-hidden hover:border-stone-300 hover:shadow-md transition-all duration-200"
    >
      {/* 65%-75% Image Container */}
      <div className="relative aspect-[4/3] bg-[#F7F7F6] overflow-hidden">
        <img
          src={imgSrc}
          alt={product.title}
          referrerPolicy="no-referrer"
          onError={() => {
            setImgSrc(getCategoryFallbackImage(product.category_slug || product.category_name));
          }}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />

        {/* Quick Action Overlays */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          {onToggleWishlist && (
            <button
              onClick={handleWishlistClick}
              className={`p-1.5 rounded-full bg-white/90 backdrop-blur-xs shadow-xs hover:bg-white transition-colors ${
                isWishlisted ? 'text-red-500' : 'text-stone-500 hover:text-stone-900'
              }`}
              title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
            >
              <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
          )}

          {onToggleCompare && (
            <button
              onClick={handleCompareClick}
              className={`p-1.5 rounded-full bg-white/90 backdrop-blur-xs shadow-xs hover:bg-white transition-colors ${
                isCompared ? 'text-stone-900 font-bold' : 'text-stone-500 hover:text-stone-900'
              }`}
              title={isCompared ? 'Remove from Compare' : 'Add to Compare'}
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stock Status Label */}
        {isOutOfStock && (
          <div className="absolute bottom-2.5 left-2.5 bg-stone-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded tracking-wide">
            Out of Stock
          </div>
        )}
        {isLowStock && (
          <div className="absolute bottom-2.5 left-2.5 bg-amber-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded tracking-wide">
            Only {product.total_available_stock} Left
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-medium text-stone-600 truncate">{product.brand || product.seller_name}</span>
            <div className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold shrink-0">
              <Star className="w-3 h-3 fill-current" />
              <span>{product.avg_rating ? product.avg_rating.toFixed(1) : '5.0'}</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-stone-900 line-clamp-1 group-hover:text-stone-700 transition-colors">
            {product.title}
          </h3>

          <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-stone-900 tabular-nums">
              {formatMoney(product.min_price_cents)}
            </div>
            <div className="text-[10px] text-stone-400">
              {product.variant_count} {product.variant_count === 1 ? 'edition' : 'editions'}
            </div>
          </div>

          {/* Quick Add Button */}
          <button
            disabled={isOutOfStock}
            onClick={handleQuickAdd}
            className="p-2 bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-800 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Quick add to cart"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
};
