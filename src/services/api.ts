import { Product, Category, User, SellerProfile, Cart, CartItem, Address, Order, ReturnRequest, ShippingZone } from '../types';

const API_BASE = '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('ce_token');
  const sessionToken = localStorage.getItem('ce_session_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (sessionToken) headers['X-Session-Token'] = sessionToken;
  return headers;
}

function handleSessionToken(res: Response) {
  const sess = res.headers.get('X-Session-Token');
  if (sess) {
    localStorage.setItem('ce_session_token', sess);
  }
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('ce_token', data.token);

    // Merge guest cart if any
    const guestSessionToken = localStorage.getItem('ce_session_token');
    if (guestSessionToken) {
      try {
        await api.mergeCart(guestSessionToken);
      } catch (e) {
        // ignore merge error
      }
    }

    return data;
  },

  async register(email: string, password: string, fullName: string, role: string = 'customer'): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName, role }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    localStorage.setItem('ce_token', data.token);
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  logout() {
    localStorage.removeItem('ce_token');
  },

  // Catalog
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    const data = await res.json();
    return data.categories;
  },

  async getProducts(params: {
    search?: string;
    category?: string;
    brand?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<{ products: Product[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category) query.set('category', params.category);
    if (params.brand) query.set('brand', params.brand);
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/products?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  async getProduct(idOrSlug: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${idOrSlug}`);
    if (!res.ok) throw new Error('Product not found');
    const data = await res.json();
    return data.product;
  },

  // Cart
  async getCart(): Promise<Cart> {
    const res = await fetch(`${API_BASE}/cart`, {
      headers: { ...getAuthHeader() },
    });
    handleSessionToken(res);
    if (!res.ok) throw new Error('Failed to fetch cart');
    return res.json();
  },

  async addToCart(variantId: string, quantity: number = 1): Promise<void> {
    const res = await fetch(`${API_BASE}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ variantId, quantity }),
    });
    handleSessionToken(res);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add item');
    }
  },

  async updateCartItem(itemId: string, quantity: number): Promise<void> {
    const res = await fetch(`${API_BASE}/cart/items/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update item');
    }
  },

  async removeCartItem(itemId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to remove item');
  },

  async mergeCart(guestSessionToken: string): Promise<void> {
    await fetch(`${API_BASE}/cart/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ guestSessionToken }),
    });
  },

  // Wishlist
  async getWishlist(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/wishlist`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.wishlist;
  },

  async toggleWishlist(productId: string): Promise<{ inWishlist: boolean }> {
    const res = await fetch(`${API_BASE}/wishlist/${productId}`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to update wishlist');
    return res.json();
  },

  // Addresses
  async getAddresses(): Promise<Address[]> {
    const res = await fetch(`${API_BASE}/addresses`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.addresses;
  },

  async saveAddress(address: Partial<Address>): Promise<string> {
    const res = await fetch(`${API_BASE}/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(address),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save address');
    }
    const data = await res.json();
    return data.addressId;
  },

  async deleteAddress(id: string): Promise<void> {
    await fetch(`${API_BASE}/addresses/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
  },

  // Coupons & Shipping
  async validateCoupon(code: string, subtotalCents: number): Promise<any> {
    const res = await fetch(`${API_BASE}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotalCents }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid coupon');
    return data;
  },

  async getShippingZones(): Promise<ShippingZone[]> {
    const res = await fetch(`${API_BASE}/shipping-zones`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.zones;
  },

  // Checkout & Payments
  async createCheckout(payload: {
    shippingAddress: any;
    shippingZoneId?: string;
    couponCode?: string;
    currency?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout reservation failed');
    return data;
  },

  async submitSandboxPayment(orderId: string, simulateStatus: 'success' | 'failure' = 'success'): Promise<any> {
    const res = await fetch(`${API_BASE}/payments/sandbox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ orderId, simulateStatus, paymentMethod: 'Credit Card (Sandbox)' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Payment failed');
    return data;
  },

  // Orders & Returns
  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.orders;
  },

  async getOrder(id: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Order not found');
    const data = await res.json();
    return data.order;
  },

  async simulateDelivery(orderId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/simulate-delivery`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to simulate delivery');
  },

  async requestReturn(orderId: string, orderItemId: string, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/returns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ orderItemId, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to request return');
    return data;
  },

  // Seller API
  async applySeller(storeName: string, supportEmail: string, description: string): Promise<any> {
    const res = await fetch(`${API_BASE}/seller/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ storeName, supportEmail, description }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to apply as seller');
    }
    return res.json();
  },

  async getSellerProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/seller/products`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to fetch seller products');
    const data = await res.json();
    return data.products;
  },

  async createSellerProduct(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/seller/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create product');
    }
    return res.json();
  },

  async deleteSellerProduct(productId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/seller/products/${productId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to delete product');
  },

  async getSellerOrders(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/seller/orders`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.orders;
  },

  async fulfillSellerOrder(sellerOrderId: string, carrier?: string, trackingNumber?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/seller/orders/${sellerOrderId}/fulfill`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ carrier, trackingNumber }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fulfill order');
    return data;
  },

  async getSellerReturns(): Promise<ReturnRequest[]> {
    const res = await fetch(`${API_BASE}/seller/returns`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.returns;
  },

  async reviewSellerReturn(returnId: string, decision: 'APPROVED' | 'REJECTED', notes?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/seller/returns/${returnId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ decision, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to review return');
    return data;
  },

  async getSellerAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/seller/analytics`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.analytics;
  },

  // Admin API
  async getAdminSellers(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/sellers`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to fetch sellers');
    const data = await res.json();
    return data.sellers;
  },

  async updateSellerStatus(sellerId: string, status: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/sellers/${sellerId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update seller status');
    }
  },

  async getAdminOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/admin/orders`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.orders;
  },

  async getAdminAudit(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/audit`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.auditEvents;
  },

  async getAdminStats(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to fetch admin stats');
    return res.json();
  },

  // AI Assistant
  async sendAiChat(message: string): Promise<any> {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error('AI Assistant is temporarily unavailable');
    return res.json();
  },

  async confirmAiCartProposal(proposalId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/ai/cart-proposal/${proposalId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to confirm proposal');
    return data;
  },

  // Recommendations
  async getRecommendations(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/recommendations`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.recommendations;
  },
};
