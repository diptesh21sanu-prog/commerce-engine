import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  quickLogin: (roleKey: 'customer' | 'seller_krona' | 'seller_aethel' | 'seller_velox' | 'admin') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_ACCOUNTS = {
  customer: { email: 'customer@example.com', pass: 'CustomerPass123!', label: 'Customer (Liam)' },
  seller_krona: { email: 'seller.krona@commerceengine.io', pass: 'SellerPass123!', label: 'Seller: Krona Audio' },
  seller_aethel: { email: 'seller.aethel@commerceengine.io', pass: 'SellerPass123!', label: 'Seller: Aethel Ceramics' },
  seller_velox: { email: 'seller.velox@commerceengine.io', pass: 'SellerPass123!', label: 'Seller: Velox Gear (Pending/Approved)' },
  admin: { email: 'admin@commerceengine.io', pass: 'AdminPass123!', label: 'Platform Admin' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const data = await api.login(email, pass);
    setUser(data.user);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const quickLogin = async (roleKey: keyof typeof DEMO_ACCOUNTS) => {
    const cred = DEMO_ACCOUNTS[roleKey];
    await login(cred.email, cred.pass);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, quickLogin, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
