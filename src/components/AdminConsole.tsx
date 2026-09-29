import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { api } from '../services/api';
import { Order } from '../types';
import { Shield, RefreshCw, CheckCircle, Ban, FileText, Package, Users, Store } from 'lucide-react';

export const AdminConsole: React.FC = () => {
  const { user, quickLogin } = useAuth();
  const { formatMoney } = useCurrency();

  const [activeTab, setActiveTab] = useState<'merchants' | 'orders' | 'audit'>('merchants');
  const [sellers, setSellers] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!user || user.role !== 'admin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [sellersData, statsData, ordersData, auditData] = await Promise.all([
        api.getAdminSellers(),
        api.getAdminStats(),
        api.getAdminOrders(),
        api.getAdminAudit(),
      ]);
      setSellers(sellersData);
      setStats(statsData.metrics);
      setOrders(ordersData);
      setAuditEvents(auditData);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleStatusChange = async (sellerId: string, newStatus: string) => {
    try {
      await api.updateSellerStatus(sellerId, newStatus);
      setMessage(`Merchant status updated to ${newStatus}.`);
      loadData();
    } catch (err: any) {
      setMessage(`Failed: ${err.message}`);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <Shield className="w-12 h-12 text-stone-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-stone-900 mb-2">Platform Admin Dashboard</h2>
        <p className="text-xs text-stone-500 max-w-md mx-auto mb-6">
          Restricted to platform operators for merchant verification, policy moderation, dispute inspection, and GMV monitoring.
        </p>
        <button
          onClick={() => quickLogin('admin')}
          className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-md hover:bg-stone-800"
        >
          Authenticate as Platform Director (Admin)
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Admin Dashboard</h1>
          <p className="text-xs text-stone-500 mt-0.5">Platform governance, merchant onboarding, transactions, and audit trail.</p>
        </div>
        <button
          onClick={loadData}
          className="text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3 py-1.5 rounded-md flex items-center gap-1.5 w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-stone-200">
            <div className="text-[11px] text-stone-500 font-medium">TOTAL PUBLISHED SKUS</div>
            <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums">{stats.totalProducts}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Active catalog listings</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200">
            <div className="text-[11px] text-stone-500 font-medium">ACTIVE MERCHANTS</div>
            <div className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">{stats.activeSellers}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">{stats.pendingSellers} pending reviews</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200">
            <div className="text-[11px] text-stone-500 font-medium">TOTAL COMPLETED ORDERS</div>
            <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums">{stats.totalOrders}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Paid checkouts</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200">
            <div className="text-[11px] text-stone-500 font-medium">PLATFORM USERS</div>
            <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums">{stats.totalUsers}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Accounts registered</div>
          </div>
        </div>
      )}

      {message && (
        <div className="mb-6 p-3 bg-stone-900 text-white text-xs rounded-lg flex justify-between items-center">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-stone-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 mb-6 text-xs font-medium w-fit">
        <button
          onClick={() => setActiveTab('merchants')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'merchants' ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Merchants ({sellers.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'orders' ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'audit' ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Audit Log ({auditEvents.length})
        </button>
      </div>

      {/* TAB 1: MERCHANTS */}
      {activeTab === 'merchants' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#FAF9F7] text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="p-3">Store Name</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Commission</th>
                  <th className="p-3">Products</th>
                  <th className="p-3 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-50">
                    <td className="p-3">
                      <div className="font-semibold text-stone-900">{s.store_name}</div>
                      <div className="text-[10px] text-stone-400 font-mono">{s.id}</div>
                    </td>
                    <td className="p-3 text-stone-600">
                      <div>{s.owner_name}</div>
                      <div className="text-[10px] text-stone-400">{s.support_email}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        s.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                        s.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono tabular-nums">
                      {(s.commission_rate_basis_points / 100).toFixed(1)}%
                    </td>
                    <td className="p-3 font-mono font-medium">
                      {s.total_products || 0}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.status !== 'approved' && (
                          <button
                            onClick={() => handleStatusChange(s.id, 'approved')}
                            className="px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100"
                          >
                            Approve
                          </button>
                        )}
                        {s.status === 'approved' && (
                          <button
                            onClick={() => handleStatusChange(s.id, 'suspended')}
                            className="px-2.5 py-1 text-[11px] font-medium text-red-700 bg-red-50 rounded hover:bg-red-100"
                          >
                            Suspend
                          </button>
                        )}
                        {s.status === 'suspended' && (
                          <button
                            onClick={() => handleStatusChange(s.id, 'approved')}
                            className="px-2.5 py-1 text-[11px] font-medium text-stone-700 bg-stone-100 rounded hover:bg-stone-200"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ALL ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#FAF9F7] text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-400">
                      No platform orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-stone-50">
                      <td className="p-3 font-mono font-bold text-stone-900">{o.order_number}</td>
                      <td className="p-3 text-stone-600">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-stone-800">
                        <div>{o.shipping_address?.fullName || 'Customer'}</div>
                        <div className="text-[10px] text-stone-400">{o.user_id}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          o.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                          o.status === 'DELIVERED' ? 'bg-stone-900 text-white' :
                          'bg-stone-100 text-stone-700'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono tabular-nums font-bold text-stone-900">
                        {formatMoney(o.total_cents)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-200">
            <h2 className="text-sm font-bold text-stone-900">Immutable Audit Trail</h2>
            <p className="text-[11px] text-stone-400">Chronological security and transaction events recorded across the platform.</p>
          </div>

          <div className="divide-y divide-stone-100 text-xs">
            {auditEvents.length === 0 ? (
              <div className="p-8 text-center text-stone-400">No events recorded.</div>
            ) : (
              auditEvents.map((ev) => (
                <div key={ev.id} className="p-3.5 flex items-start justify-between gap-4 hover:bg-stone-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-stone-900">{ev.action}</span>
                      <span className="text-[10px] text-stone-400 font-mono">[{ev.entity_name}:{ev.entity_id}]</span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                      {ev.metadata_json}
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-stone-400 font-mono shrink-0">
                    <div>{new Date(ev.created_at).toLocaleTimeString()}</div>
                    <div>{new Date(ev.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
