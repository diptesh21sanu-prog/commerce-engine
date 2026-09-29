import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Product, Category, ReturnRequest } from '../types';
import { api } from '../services/api';
import { Store, Plus, AlertCircle, ShieldAlert, CheckCircle2, Trash2, Package, Truck, RotateCcw, TrendingUp } from 'lucide-react';

export const SellerStudio: React.FC = () => {
  const { user, quickLogin } = useAuth();
  const { formatMoney } = useCurrency();

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'returns'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [sellerReturns, setSellerReturns] = useState<ReturnRequest[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [crossTenantTestResult, setCrossTenantTestResult] = useState<string | null>(null);

  // New Listing State
  const [newTitle, setNewTitle] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [variants, setVariants] = useState([
    { sku: '', title: 'Standard Edition', priceCents: 12000, stockOnHand: 10, option1Name: 'Finish', option1Value: 'Matte' },
  ]);

  const loadData = async () => {
    if (!user || user.role !== 'seller') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [cats, prods, ords, rets, anls] = await Promise.all([
        api.getCategories(),
        user.seller?.status === 'approved' ? api.getSellerProducts() : Promise.resolve([]),
        user.seller?.status === 'approved' ? api.getSellerOrders() : Promise.resolve([]),
        user.seller?.status === 'approved' ? api.getSellerReturns() : Promise.resolve([]),
        user.seller?.status === 'approved' ? api.getSellerAnalytics() : Promise.resolve(null),
      ]);
      setCategories(cats);
      if (cats.length > 0 && !newCategoryId) setNewCategoryId(cats[0].id);
      setProducts(prods);
      setSellerOrders(ords);
      setSellerReturns(rets);
      setAnalytics(anls);
    } catch (err: any) {
      console.error('Failed to load seller data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSellerProduct({
        title: newTitle,
        categoryId: newCategoryId,
        brand: newBrand || user?.seller?.store_name || 'Independent',
        description: newDescription,
        variants,
      });
      setMessage('Product and SKU variants published successfully!');
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      loadData();
    } catch (err: any) {
      setMessage(`Failed: ${err.message}`);
    }
  };

  const handleFulfillOrder = async (sellerOrderId: string) => {
    try {
      await api.fulfillSellerOrder(sellerOrderId);
      setMessage('Order fulfilled and shipment tracking started.');
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleReviewReturn = async (returnId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await api.reviewSellerReturn(returnId, decision);
      setMessage(`Return ${decision.toLowerCase()} successfully.`);
      loadData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const runCrossTenantSecurityTest = async () => {
    setCrossTenantTestResult('Testing cross-tenant data isolation...');
    try {
      const allProds = await api.getProducts({ limit: 10 });
      const target = allProds.products.find((p) => p.seller_id !== user?.seller?.id);
      if (!target) {
        setCrossTenantTestResult('No external seller product found to test against.');
        return;
      }

      const token = localStorage.getItem('ce_token');
      const res = await fetch(`/api/v1/seller/products/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        setCrossTenantTestResult(`✓ ISOLATION VERIFIED: The server rejected unauthorized modification of Seller "${target.seller_name}" product with 403 Forbidden.`);
      } else {
        setCrossTenantTestResult(`Unexpected status: ${res.status}`);
      }
    } catch (err: any) {
      setCrossTenantTestResult(`Test error: ${err.message}`);
    }
  };

  if (!user || user.role !== 'seller') {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <Store className="w-12 h-12 text-stone-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-stone-900 mb-2">Seller Dashboard</h2>
        <p className="text-xs text-stone-500 max-w-md mx-auto mb-6">
          Access your merchant store to manage listings, track live stock, fulfill customer orders, and approve refunds.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => quickLogin('seller_krona')}
            className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-md hover:bg-stone-800"
          >
            Enter as Seller: Krona Audio
          </button>
          <button
            onClick={() => quickLogin('seller_aethel')}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 rounded-md hover:bg-stone-200"
          >
            Enter as Seller: Aethel Ceramics
          </button>
        </div>
      </div>
    );
  }

  const seller = user.seller;
  const isPending = seller?.status === 'pending';

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-stone-900">{seller?.store_name}</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              seller?.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              seller?.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-red-50 text-red-700'
            }`}>
              {seller?.status}
            </span>
          </div>
          <div className="text-xs text-stone-500 flex items-center gap-3">
            <span>Commission: {(seller?.commission_rate_basis_points || 1000) / 100}%</span>
            <span>·</span>
            <span>Support: {seller?.support_email}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {seller?.status === 'approved' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-md hover:bg-stone-800 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          )}

          <button
            onClick={runCrossTenantSecurityTest}
            className="px-3 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-stone-600" />
            <span>Test Tenant Security</span>
          </button>
        </div>
      </div>

      {crossTenantTestResult && (
        <div className="mb-6 p-4 rounded-lg bg-stone-900 text-white text-xs font-mono flex justify-between items-center">
          <span>{crossTenantTestResult}</span>
          <button onClick={() => setCrossTenantTestResult(null)} className="text-stone-400 hover:text-white">✕</button>
        </div>
      )}

      {message && (
        <div className="mb-6 p-3 bg-stone-100 border border-stone-300 text-stone-800 text-xs rounded-lg flex justify-between items-center">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-stone-400 hover:text-stone-900">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 mb-6 text-xs font-medium w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'overview' ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Overview & Insights
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'orders' ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Orders to Fulfill ({sellerOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'products' ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Products & Stock ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'returns' ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Returns & Refunds ({sellerReturns.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-stone-200">
              <div className="text-[11px] text-stone-500 font-medium">TOTAL SALES</div>
              <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums">
                {formatMoney(analytics?.grossSalesCents || 0)}
              </div>
              <div className="text-[10px] text-stone-400 mt-0.5">Gross customer volume</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200">
              <div className="text-[11px] text-stone-500 font-medium">NET EARNINGS</div>
              <div className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
                {formatMoney(analytics?.netPayoutCents || 0)}
              </div>
              <div className="text-[10px] text-stone-400 mt-0.5">After platform commission</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200">
              <div className="text-[11px] text-stone-500 font-medium">SUBORDERS PROCESSED</div>
              <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums">
                {analytics?.totalOrders || 0}
              </div>
              <div className="text-[10px] text-stone-400 mt-0.5">Placed by verified buyers</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200">
              <div className="text-[11px] text-stone-500 font-medium">RETURNS PROCESSED</div>
              <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums">
                {analytics?.totalReturns || 0}
              </div>
              <div className="text-[10px] text-stone-400 mt-0.5">Item returns reviewed</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200">
            <h2 className="text-sm font-bold text-stone-900 mb-2">Seller Insights</h2>
            <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
              Demand for your core SKU listings remains high. Monitor stock counts in the <strong>Products & Stock</strong> tab to prevent checkout reservation conflicts. All orders can be dispatched with tracking numbers from the <strong>Orders to Fulfill</strong> tab.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS TO FULFILL */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-stone-900">Orders to Fulfill</h2>
            <span className="text-xs text-stone-400">Strictly isolated to {seller?.store_name}</span>
          </div>

          {sellerOrders.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-500">
              No pending orders. When a customer purchases from your store, it will appear here.
            </div>
          ) : (
            <div className="divide-y divide-stone-100 text-xs">
              {sellerOrders.map((o) => (
                <div key={o.id} className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-stone-900">{o.suborder_number}</span>
                      <span className="text-stone-400 mx-2">·</span>
                      <span className="text-stone-600">Buyer: {o.buyer_name} ({o.shipping_address?.city}, {o.shipping_address?.state})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                        o.status === 'PAID' ? 'bg-amber-50 text-amber-700' :
                        o.status === 'SHIPPED' ? 'bg-blue-50 text-blue-700' :
                        'bg-stone-900 text-white'
                      }`}>
                        {o.status === 'PAID' ? 'Needs Dispatch' : o.status}
                      </span>
                      {o.status === 'PAID' && (
                        <button
                          onClick={() => handleFulfillOrder(o.id)}
                          className="px-3 py-1 bg-stone-900 text-white font-medium rounded hover:bg-stone-800 transition-colors"
                        >
                          Fulfill & Ship
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items in suborder */}
                  <div className="bg-stone-50 p-2.5 rounded border border-stone-200 space-y-1.5">
                    {o.items?.map((it: any) => (
                      <div key={it.id} className="flex justify-between text-stone-700">
                        <span>{it.snapshot_title} <span className="text-stone-400 font-mono">(x{it.quantity})</span></span>
                        <span className="font-mono tabular-nums font-semibold">{formatMoney(it.total_price_cents)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRODUCTS & STOCK */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-stone-900">Product Listings ({products.length})</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-stone-900 rounded-md hover:bg-stone-800"
            >
              + Add Product
            </button>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#FAF9F7] text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price Range</th>
                  <th className="p-3">Stock Units</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="p-3">
                      <div className="font-semibold text-stone-900">{p.title}</div>
                      <div className="text-[10px] text-stone-400 font-mono">{p.id}</div>
                    </td>
                    <td className="p-3 text-stone-600">{p.category_name}</td>
                    <td className="p-3 font-mono tabular-nums">
                      {formatMoney(p.min_price_cents)}
                      {p.min_price_cents !== p.max_price_cents && ` – ${formatMoney(p.max_price_cents)}`}
                    </td>
                    <td className="p-3 font-mono font-bold text-stone-900">
                      {p.total_available_stock} units
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={async () => {
                          if (confirm('Archive this product?')) {
                            await api.deleteSellerProduct(p.id);
                            loadData();
                          }
                        }}
                        className="text-stone-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RETURNS */}
      {activeTab === 'returns' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-200">
            <h2 className="text-sm font-bold text-stone-900">Customer Return Requests</h2>
          </div>

          {sellerReturns.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-500">
              No return requests.
            </div>
          ) : (
            <div className="divide-y divide-stone-100 text-xs">
              {sellerReturns.map((r) => (
                <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900">{r.snapshot_title}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      Reason: <span className="font-medium text-stone-700">{r.reason}</span>
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      Buyer: {r.buyer_name} · Requested Refund: {formatMoney(r.requested_amount_cents)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {r.status === 'REQUESTED' ? (
                      <>
                        <button
                          onClick={() => handleReviewReturn(r.id, 'APPROVED')}
                          className="px-3 py-1 bg-stone-900 text-white font-medium rounded hover:bg-stone-800"
                        >
                          Approve Refund
                        </button>
                        <button
                          onClick={() => handleReviewReturn(r.id, 'REJECTED')}
                          className="px-3 py-1 bg-stone-100 text-stone-700 font-medium rounded hover:bg-stone-200"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        r.status === 'REFUNDED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {r.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-stone-200 p-6 my-8 text-xs">
            <h2 className="text-sm font-bold text-stone-900 mb-4">Add Product to Store</h2>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-stone-700 font-medium mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sculpted Beechwood Stool"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Category</label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:outline-none focus:border-stone-900"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Material specs, provenance, dimensions..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:outline-none focus:border-stone-900"
                />
              </div>

              {/* Variant builder */}
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-800">Initial SKU Variant:</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-stone-500">SKU Code</label>
                    <input
                      type="text"
                      required
                      placeholder="SKU-001"
                      value={variants[0].sku}
                      onChange={(e) => {
                        const copy = [...variants];
                        copy[0].sku = e.target.value;
                        setVariants(copy);
                      }}
                      className="w-full px-2 py-1 border border-stone-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-500">Base Price (USD Cents)</label>
                    <input
                      type="number"
                      required
                      value={variants[0].priceCents}
                      onChange={(e) => {
                        const copy = [...variants];
                        copy[0].priceCents = parseInt(e.target.value, 10) || 0;
                        setVariants(copy);
                      }}
                      className="w-full px-2 py-1 border border-stone-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-500">Stock Count</label>
                    <input
                      type="number"
                      required
                      value={variants[0].stockOnHand}
                      onChange={(e) => {
                        const copy = [...variants];
                        copy[0].stockOnHand = parseInt(e.target.value, 10) || 0;
                        setVariants(copy);
                      }}
                      className="w-full px-2 py-1 border border-stone-300 rounded font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 text-white rounded font-medium hover:bg-stone-800"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
