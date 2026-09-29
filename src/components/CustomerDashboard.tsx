import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { api } from '../services/api';
import { Order, Address, Product } from '../types';
import { 
  Package, Heart, MapPin, RotateCcw, Clock, Truck, 
  CheckCircle2, AlertCircle, Trash2, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { getCategoryFallbackImage } from '../utils/imageFallback';

export const CustomerDashboard: React.FC<{ onNavigateToProduct?: (id: string) => void }> = ({ onNavigateToProduct }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { formatMoney } = useCurrency();

  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'addresses' | 'returns'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Return request modal
  const [returnItemModal, setReturnItemModal] = useState<{ orderId: string; item: any } | null>(null);
  const [returnReason, setReturnReason] = useState('Changed mind / Does not fit aesthetic');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // New address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newFullName, setNewFullName] = useState(user?.fullName || '');
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newZip, setNewZip] = useState('');

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [ordersData, wishlistData, addressesData] = await Promise.all([
        api.getOrders(),
        api.getWishlist(),
        api.getAddresses(),
      ]);
      setOrders(ordersData);
      setWishlist(wishlistData);
      setAddresses(addressesData);

      // If an order was selected, refresh it
      if (selectedOrder) {
        const refreshed = await api.getOrder(selectedOrder.id);
        setSelectedOrder(refreshed);
      }
    } catch (err: any) {
      console.error('Failed to load customer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSimulateDelivery = async (orderId: string) => {
    try {
      await api.simulateDelivery(orderId);
      setActionMessage('Shipment delivered! Item is now eligible for return.');
      const updated = await api.getOrder(orderId);
      setSelectedOrder(updated);
      loadData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleOpenReturnModal = (orderId: string, item: any) => {
    setReturnItemModal({ orderId, item });
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnItemModal) return;
    setSubmittingReturn(true);

    try {
      await api.requestReturn(returnItemModal.orderId, returnItemModal.item.id, returnReason);
      setActionMessage('Return request submitted to the merchant for review.');
      setReturnItemModal(null);
      loadData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveAddress({
        full_name: newFullName,
        street_address: newStreet,
        city: newCity,
        state: newState,
        postal_code: newZip,
        is_default: addresses.length === 0 ? 1 : 0,
      });
      setShowAddressForm(false);
      setNewStreet('');
      setNewCity('');
      setNewState('');
      setNewZip('');
      loadData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-stone-900 mb-1">Customer Account & Orders</h2>
        <p className="text-xs text-stone-500 mb-6">
          Sign in or switch persona above to view your order history, tracked deliveries, and saved items.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Profile Bar */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{user.fullName}</h1>
          <div className="text-xs text-stone-500 mt-0.5">
            {user.email} · Verified Customer Account
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => { setActiveTab('orders'); setSelectedOrder(null); }}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'orders' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Orders ({orders.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('wishlist'); setSelectedOrder(null); }}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'wishlist' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Wishlist ({wishlist.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('addresses'); setSelectedOrder(null); }}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'addresses' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Addresses ({addresses.length})</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="mb-6 p-3 bg-stone-900 text-white text-xs rounded-lg flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-stone-400 hover:text-white">✕</button>
        </div>
      )}

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <div>
          {selectedOrder ? (
            /* Detailed Order View */
            <div className="space-y-6">
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 font-medium"
              >
                ← Back to All Orders
              </button>

              <div className="bg-white p-6 rounded-xl border border-stone-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-2">
                  <div>
                    <div className="text-xs text-stone-400 font-mono">Reference: {selectedOrder.order_number}</div>
                    <div className="text-base font-bold text-stone-900">
                      Order Placed on {new Date(selectedOrder.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 text-xs rounded-md font-semibold ${
                      selectedOrder.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      selectedOrder.status === 'DELIVERED' ? 'bg-stone-900 text-white' :
                      selectedOrder.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
                      'bg-stone-100 text-stone-700'
                    }`}>
                      {selectedOrder.status === 'PAID' ? 'Order Placed · Processing' : selectedOrder.status}
                    </span>

                    {/* Quick Demo Test Action */}
                    {selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleSimulateDelivery(selectedOrder.id)}
                        className="px-3 py-1 text-xs font-medium text-stone-700 bg-stone-100 border border-stone-300 rounded hover:bg-stone-200"
                        title="Simulate carrier delivery to immediately test returns and reviews"
                      >
                        Simulate Delivery
                      </button>
                    )}
                  </div>
                </div>

                {/* Suborders by Seller */}
                <div className="mt-6 space-y-6">
                  {selectedOrder.suborders?.map((sub: any) => (
                    <div key={sub.id} className="p-4 border border-stone-200 rounded-lg bg-stone-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold text-stone-800">
                          Dispatched by: <span className="text-stone-900">{sub.seller_name}</span>
                        </div>
                        <div className="text-xs text-stone-500 font-mono">
                          {sub.carrier || 'Global Express'} · Tracking: {sub.tracking_number || 'TRK-PENDING'}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-3">
                        {sub.items?.map((it: any) => (
                          <div key={it.id} className="flex items-center justify-between bg-white p-3 rounded border border-stone-200 text-xs">
                            <div className="flex items-center gap-3">
                              <img
                                src={it.snapshot_image || (it.variant_id ? `/api/v1/images/products/${it.variant_id.replace(/^var-([a-z]+)-([0-9]+)-[ab]$/i, 'prod-$1-$2')}` : `/api/v1/images/products/${it.id}`)}
                                alt={it.snapshot_title}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getCategoryFallbackImage();
                                }}
                                className="w-12 h-12 object-cover rounded bg-stone-100"
                              />
                              <div>
                                <div className="font-semibold text-stone-900">{it.snapshot_title}</div>
                                <div className="text-[11px] text-stone-400 font-mono">SKU: {it.snapshot_sku} · Qty: {it.quantity}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="font-bold tabular-nums text-stone-900">
                                {formatMoney(it.total_price_cents)}
                              </div>

                              {selectedOrder.status === 'DELIVERED' && (
                                <button
                                  onClick={() => handleOpenReturnModal(selectedOrder.id, it)}
                                  className="px-2.5 py-1 text-[11px] font-medium text-stone-700 bg-stone-100 border border-stone-300 rounded hover:bg-stone-200"
                                >
                                  Return Item
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Tracking timeline */}
                      {sub.tracking_events && sub.tracking_events.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-stone-200 text-xs">
                          <span className="font-semibold text-stone-800 block mb-2">Shipment Progress:</span>
                          <div className="space-y-1.5">
                            {sub.tracking_events.map((ev: any) => (
                              <div key={ev.id} className="flex items-center gap-2 text-stone-600 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="font-mono text-stone-400">{new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span>{ev.description}</span>
                                {ev.location && <span className="text-stone-400">({ev.location})</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="mt-6 pt-4 border-t border-stone-200 flex justify-end">
                  <div className="w-64 space-y-1.5 text-xs text-right">
                    <div className="flex justify-between text-stone-600">
                      <span>Subtotal</span>
                      <span className="font-mono tabular-nums">{formatMoney(selectedOrder.subtotal_cents)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Delivery</span>
                      <span className="font-mono tabular-nums">{selectedOrder.shipping_cents === 0 ? 'FREE' : formatMoney(selectedOrder.shipping_cents)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Tax</span>
                      <span className="font-mono tabular-nums">{formatMoney(selectedOrder.tax_cents)}</span>
                    </div>
                    {selectedOrder.discount_cents > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount</span>
                        <span className="font-mono tabular-nums">-{formatMoney(selectedOrder.discount_cents)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-bold text-stone-900">
                      <span>Total Paid ({selectedOrder.currency})</span>
                      <span className="font-mono tabular-nums">{formatMoney(selectedOrder.total_cents)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Orders List */
            orders.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xl border border-stone-200">
                <Package className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-stone-900">No placed orders</h3>
                <p className="text-xs text-stone-400 mt-1">When you complete checkout, your order will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    onClick={async () => {
                      const det = await api.getOrder(o.id);
                      setSelectedOrder(det);
                    }}
                    className="cursor-pointer bg-white p-4 rounded-xl border border-stone-200 hover:border-stone-400 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-semibold text-stone-900">{o.order_number}</span>
                        <span className="text-[11px] text-stone-400">·</span>
                        <span className="text-xs text-stone-500">{new Date(o.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-stone-600">
                        {o.total_items_count || 1} items · Dispatched by {o.seller_count || 1} merchant(s)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-stone-900 text-sm tabular-nums">
                        {formatMoney(o.total_cents)}
                      </div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                        o.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                        o.status === 'DELIVERED' ? 'bg-stone-900 text-white' :
                        'bg-stone-100 text-stone-700'
                      }`}>
                        {o.status === 'PAID' ? 'Order Placed' : o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* TAB 2: WISHLIST */}
      {activeTab === 'wishlist' && (
        <div>
          {wishlist.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-stone-200">
              <Heart className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-stone-900">Your wishlist is empty</h3>
              <p className="text-xs text-stone-400 mt-1">Save your favorite handcrafted pieces while browsing.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {wishlist.map((item) => (
                <div key={item.id} className="bg-white p-3 rounded-lg border border-stone-200 flex flex-col justify-between">
                  <div>
                    <img
                      src={item.primary_image || `/api/v1/images/products/${item.id}`}
                      alt={item.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getCategoryFallbackImage(item.category_name);
                      }}
                      className="w-full aspect-[4/3] object-cover rounded-md mb-2 bg-stone-100"
                    />
                    <div className="text-[11px] text-stone-400 font-medium">{item.category_name}</div>
                    <h3 className="text-xs font-semibold text-stone-900 line-clamp-1">{item.title}</h3>
                    <div className="text-xs font-bold text-stone-900 mt-1 tabular-nums">
                      {formatMoney(item.min_price_cents)}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <button
                      onClick={() => onNavigateToProduct?.(item.id)}
                      className="text-xs font-medium text-stone-900 hover:underline"
                    >
                      View Product
                    </button>
                    <button
                      onClick={async () => {
                        await api.toggleWishlist(item.product_id || item.id);
                        loadData();
                      }}
                      className="text-stone-400 hover:text-red-600 p-1"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADDRESSES */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-stone-900">Delivery Address Book</h2>
            <button
              onClick={() => setShowAddressForm(!showAddressForm)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-stone-900 rounded-md hover:bg-stone-800"
            >
              + Add Address
            </button>
          </div>

          {showAddressForm && (
            <form onSubmit={handleSaveAddress} className="bg-white p-4 rounded-xl border border-stone-200 text-xs space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={newZip}
                    onChange={(e) => setNewZip(e.target.value)}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="px-3 py-1.5 text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-stone-900 text-white rounded font-medium"
                >
                  Save Address
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((a) => (
              <div key={a.id} className="bg-white p-4 rounded-xl border border-stone-200 text-xs flex justify-between items-start">
                <div>
                  <div className="font-bold text-stone-900 mb-1">{a.full_name}</div>
                  <div className="text-stone-600 leading-relaxed">
                    {a.street_address}<br />
                    {a.city}, {a.state} {a.postal_code}<br />
                    {a.country}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await api.deleteAddress(a.id);
                    loadData();
                  }}
                  className="text-stone-400 hover:text-red-600 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      {returnItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-stone-200 p-6 text-xs">
            <button
              onClick={() => setReturnItemModal(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
            >
              ✕
            </button>

            <h3 className="text-sm font-bold text-stone-900 mb-1">Request Item Return</h3>
            <p className="text-stone-500 mb-4">
              Item: <strong>{returnItemModal.item.snapshot_title}</strong> (Refund: {formatMoney(returnItemModal.item.total_price_cents)})
            </p>

            <form onSubmit={handleSubmitReturn} className="space-y-4">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Reason for Return</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:outline-none focus:border-stone-900"
                >
                  <option value="Changed mind / Does not fit aesthetic">Changed mind / Does not fit aesthetic</option>
                  <option value="Ordered incorrect size or finish">Ordered incorrect size or finish</option>
                  <option value="Item received does not match description">Item received does not match description</option>
                  <option value="Minor cosmetic imperfection">Minor cosmetic imperfection</option>
                </select>
              </div>

              <div className="p-3 bg-stone-50 rounded border border-stone-200 text-stone-600 text-[11px] leading-relaxed">
                Upon seller approval, a refund of <strong>{formatMoney(returnItemModal.item.total_price_cents)}</strong> will be credited directly to your original payment method.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnItemModal(null)}
                  className="px-3 py-1.5 text-stone-600 hover:text-stone-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="px-4 py-2 bg-stone-900 text-white rounded font-medium hover:bg-stone-800 disabled:opacity-50"
                >
                  {submittingReturn ? 'Submitting...' : 'Submit Return Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
