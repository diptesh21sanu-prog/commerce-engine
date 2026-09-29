import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import { api } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { Search, SlidersHorizontal, ArrowUpDown, Sparkles } from 'lucide-react';

interface StorefrontProps {
  onOpenCheckoutWithItem?: (variantId: string, quantity: number) => void;
  onOpenCompare?: () => void;
  comparedProducts: Product[];
  onToggleCompare: (product: Product) => void;
  onSelectProductDetail?: (productId: string) => void;
}

export const Storefront: React.FC<StorefrontProps> = ({
  onOpenCheckoutWithItem,
  onOpenCompare,
  comparedProducts,
  onToggleCompare,
  onSelectProductDetail,
}) => {
  const { formatMoney } = useCurrency();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  // Load Categories & Wishlist
  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
    api.getWishlist().then((list) => {
      setWishlistIds(new Set(list.map((p) => p.product_id || p.id)));
    }).catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load products
  useEffect(() => {
    setLoading(true);
    api.getProducts({
      category: selectedCategory,
      search: debouncedSearch,
      sort: sortBy,
      page,
      limit: 24,
    })
      .then((data) => {
        setProducts(data.products);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load products:', err);
        setLoading(false);
      });
  }, [selectedCategory, debouncedSearch, sortBy, page]);

  const handleToggleWishlist = async (productId: string) => {
    try {
      const res = await api.toggleWishlist(productId);
      const copy = new Set(wishlistIds);
      if (res.inWishlist) {
        copy.add(productId);
        showToast('Saved to your wishlist', 'success');
      } else {
        copy.delete(productId);
        showToast('Removed from your wishlist', 'info');
      }
      setWishlistIds(copy);
    } catch (err: any) {
      showToast('Please sign in to save items to your wishlist.', 'info');
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9]">
      {/* Editorial Hero Section */}
      <section className="relative bg-[#18181B] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-14 sm:py-20 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 z-10">
            <div className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">
              Independent Multi-Vendor Marketplace
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
              Honest materials. Enduring craft.
            </h1>
            <p className="text-sm text-stone-300 max-w-lg mb-6 leading-relaxed">
              Explore 200 verified artisanal creations from independent European workshops—from high-resolution acoustic instruments to reduction-kiln stoneware and hand-assembled chronographs.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-300">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>200+ Products In Stock</span>
              </div>
              <span>·</span>
              <div>3 Verified Independent Merchants</div>
              <span>·</span>
              <div>Multi-Currency Checkout</div>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="relative aspect-[16/9] rounded-xl overflow-hidden shadow-2xl border border-stone-800">
              <img
                src="/src/assets/images/hero_marketplace_lifestyle_1790349187809.jpg"
                alt="Curated architectural interior showcase"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 text-xs text-stone-300">
                Curated Homewares & Instruments
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Discovery & Filter Bar */}
      <section className="border-b border-stone-200 bg-white sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => { setSelectedCategory(''); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === ''
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              All Categories ({totalCount})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCategory(c.slug); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  selectedCategory === c.slug
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {c.name} {c.product_count !== undefined ? `(${c.product_count})` : ''}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-stone-300 rounded-md focus:outline-none focus:border-stone-900 bg-stone-50/50"
              />
            </div>

            {/* Sort Select */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 text-xs border border-stone-300 rounded-md bg-white text-stone-700 focus:outline-none focus:border-stone-900"
              >
                <option value="newest">Sort by: Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="title_asc">Name: A to Z</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Grid */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse bg-stone-100 rounded-xl aspect-[4/3]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-xl border border-stone-200">
            <h3 className="text-sm font-semibold text-stone-900 mb-1">No products found</h3>
            <p className="text-xs text-stone-500 mb-4">Try clearing your search query or selecting a different category.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
              className="px-4 py-2 text-xs font-semibold text-stone-900 bg-stone-100 rounded-md hover:bg-stone-200"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onSelect={(selected) => {
                    if (onSelectProductDetail) {
                      onSelectProductDetail(selected.id);
                    } else {
                      setSelectedProduct(selected);
                    }
                  }}
                  onToggleWishlist={handleToggleWishlist}
                  isWishlisted={wishlistIds.has(p.id)}
                  onToggleCompare={onToggleCompare}
                  isCompared={comparedProducts.some((cp) => cp.id === p.id)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-between border-t border-stone-200 pt-6">
                <div className="text-xs text-stone-500">
                  Page <span className="font-semibold text-stone-900">{page}</span> of{' '}
                  <span className="font-semibold text-stone-900">{totalPages}</span> ({totalCount} items)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 text-xs font-medium border border-stone-300 rounded-md disabled:opacity-40 hover:bg-stone-50 transition-colors"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, idx) => {
                      const pNum = idx + 1;
                      if (pNum === 1 || pNum === totalPages || (pNum >= page - 1 && pNum <= page + 1)) {
                        return (
                          <button
                            key={pNum}
                            onClick={() => setPage(pNum)}
                            className={`w-8 h-8 text-xs font-medium rounded-md transition-colors ${
                              page === pNum
                                ? 'bg-stone-900 text-white'
                                : 'text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            {pNum}
                          </button>
                        );
                      }
                      if (pNum === 2 && page > 3) return <span key="d1" className="text-stone-400 text-xs px-1">...</span>;
                      if (pNum === totalPages - 1 && page < totalPages - 2) return <span key="d2" className="text-stone-400 text-xs px-1">...</span>;
                      return null;
                    })}
                  </div>

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 text-xs font-medium border border-stone-300 rounded-md disabled:opacity-40 hover:bg-stone-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {!onSelectProductDetail && selectedProduct && (
        <ProductDetailModal
          productIdOrSlug={selectedProduct.id}
          onClose={() => setSelectedProduct(null)}
          onBuyNow={(variantId, qty) => {
            setSelectedProduct(null);
            onOpenCheckoutWithItem?.(variantId, qty);
          }}
          onToggleWishlist={handleToggleWishlist}
          isWishlisted={wishlistIds.has(selectedProduct.id)}
        />
      )}
    </div>
  );
};
