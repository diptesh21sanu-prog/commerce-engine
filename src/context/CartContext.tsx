import React, { createContext, useContext, useState, useEffect } from 'react';
import { Cart, CartItem } from '../types';
import { api } from '../services/api';

interface CartContextType {
  cart: Cart | null;
  itemCount: number;
  subtotalCents: number;
  loading: boolean;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const refreshCart = async () => {
    try {
      setLoading(true);
      const data = await api.getCart();
      setCart(data);
    } catch (err) {
      console.error('Failed to load cart:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const addToCart = async (variantId: string, quantity: number = 1) => {
    await api.addToCart(variantId, quantity);
    await refreshCart();
    setIsCartOpen(true); // Open cart drawer on addition
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    await api.updateCartItem(itemId, quantity);
    await refreshCart();
  };

  const removeItem = async (itemId: string) => {
    await api.removeCartItem(itemId);
    await refreshCart();
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount: cart?.itemCount || 0,
        subtotalCents: cart?.subtotalCents || 0,
        loading,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        addToCart,
        updateQuantity,
        removeItem,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
