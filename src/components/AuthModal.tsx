import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
import { X, Lock, Mail, User as UserIcon } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, quickLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName, role: 'customer' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        localStorage.setItem('ce_token', data.token);
        window.location.reload();
      } else {
        await login(email, password);
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-stone-200 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-stone-900 mb-1">
          {isRegister ? 'Create Customer Account' : 'Sign In to Commerce Engine'}
        </h2>
        <p className="text-xs text-stone-500 mb-6">
          Access your persistent cart, order tracking, address book, and verified reviews.
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Elena Rostova"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:border-stone-900"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:border-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:border-stone-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-xs font-medium text-white bg-stone-900 rounded-md hover:bg-stone-800 transition-colors mt-2"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-stone-900 hover:underline font-medium"
          >
            {isRegister ? 'Already have an account? Sign in' : 'New shopper? Create an account'}
          </button>
        </div>

        {/* Quick Demo Switcher shortcuts */}
        <div className="mt-6 pt-4 border-t border-stone-100">
          <div className="text-[11px] font-semibold text-stone-400 mb-2">QUICK 1-CLICK DEMO LOGINS</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={async () => {
                await quickLogin('customer');
                onClose();
              }}
              className="p-2 border border-stone-200 rounded text-stone-700 hover:bg-stone-50 text-left"
            >
              <div className="font-medium">Customer</div>
              <div className="text-[10px] text-stone-400">Liam Thorne</div>
            </button>
            <button
              onClick={async () => {
                await quickLogin('seller_krona');
                onClose();
              }}
              className="p-2 border border-stone-200 rounded text-stone-700 hover:bg-stone-50 text-left"
            >
              <div className="font-medium">Seller: Krona</div>
              <div className="text-[10px] text-stone-400">Audio Merchant</div>
            </button>
            <button
              onClick={async () => {
                await quickLogin('seller_aethel');
                onClose();
              }}
              className="p-2 border border-stone-200 rounded text-stone-700 hover:bg-stone-50 text-left"
            >
              <div className="font-medium">Seller: Aethel</div>
              <div className="text-[10px] text-stone-400">Ceramics Merchant</div>
            </button>
            <button
              onClick={async () => {
                await quickLogin('admin');
                onClose();
              }}
              className="p-2 border border-stone-200 rounded text-stone-700 hover:bg-stone-50 text-left"
            >
              <div className="font-medium">Platform Admin</div>
              <div className="text-[10px] text-stone-400">Eleanor Vance</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
