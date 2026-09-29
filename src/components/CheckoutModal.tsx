import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { api } from '../services/api';
import { ShippingZone, Address } from '../types';
import { X, ShieldCheck, CheckCircle2, AlertCircle, Clock, CreditCard, ArrowRight, Truck } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  couponCode?: string;
  onOrderCompleted: (orderId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  couponCode: initialCouponCode,
  onOrderCompleted,
}) => {
  const { cart, refreshCart } = useCart();
  const { user } = useAuth();
  const { currency, formatMoney } = useCurrency();

  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [couponCode, setCouponCode] = useState(initialCouponCode || '');

  // Address fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');

  // Checkout process state
  const [step, setStep] = useState<'address' | 'review_and_pay' | 'confirmation'>('address');
  const [activeReservation, setActiveReservation] = useState<any>(null);
  const [reservationTimeLeft, setReservationTimeLeft] = useState<number>(15 * 60); // 15 mins
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      api.getShippingZones().then((zones) => {
        setShippingZones(zones);
        if (zones.length > 0) setSelectedZoneId(zones[0].id);
      });
      if (user) {
        api.getAddresses().then((addrs) => {
          setSavedAddresses(addrs);
          if (addrs.length > 0) {
            const def = addrs.find((a) => a.is_default) || addrs[0];
            setFullName(def.full_name);
            setStreetAddress(def.street_address);
            setCity(def.city);
            setState(def.state);
            setPostalCode(def.postal_code);
            if (def.phone) setPhone(def.phone);
          }
        });
      }
    }
  }, [isOpen, user]);

  // Reservation countdown timer
  useEffect(() => {
    if (step === 'review_and_pay' && reservationTimeLeft > 0) {
      const timer = setInterval(() => {
        setReservationTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, reservationTimeLeft]);

  if (!isOpen) return null;

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.createCheckout({
        shippingAddress: {
          fullName,
          email: email || user?.email,
          streetAddress,
          city,
          state,
          postalCode,
          country: 'United States',
          phone,
        },
        shippingZoneId: selectedZoneId,
        couponCode: couponCode || undefined,
        currency,
      });

      setActiveReservation(res);
      setReservationTimeLeft(15 * 60);
      setStep('review_and_pay');
    } catch (err: any) {
      setError(err.message || 'Failed to initiate checkout reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async (status: 'success' | 'failure') => {
    if (!activeReservation) return;
    setError(null);
    setLoading(true);

    try {
      const payRes = await api.submitSandboxPayment(activeReservation.orderId, status);
      await refreshCart();
      setConfirmedOrder(payRes);
      setStep('confirmation');
      onOrderCompleted(activeReservation.orderId);
    } catch (err: any) {
      setError(err.message || 'Payment transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const minutes = Math.floor(reservationTimeLeft / 60);
  const seconds = reservationTimeLeft % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-stone-200 p-6 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6 pb-3 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              {step === 'confirmation' ? 'Order Confirmed' : 'Checkout & Payment'}
            </h2>
            <p className="text-xs text-stone-500">
              {step === 'address' && 'Step 1 of 2: Shipping details and delivery speed'}
              {step === 'review_and_pay' && 'Step 2 of 2: Order summary and sandbox card payment'}
              {step === 'confirmation' && 'Your order has been paid and dispatched to sellers.'}
            </p>
          </div>

          {step === 'review_and_pay' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs font-mono tabular-nums">
              <Clock className="w-3.5 h-3.5" />
              <span>Stock Reserved: {minutes}:{seconds.toString().padStart(2, '0')}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: ADDRESS & SHIPPING */}
        {step === 'address' && (
          <form onSubmit={handleCreateReservation} className="space-y-4">
            {savedAddresses.length > 0 && (
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs">
                <span className="font-semibold text-stone-800">Use Saved Address:</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {savedAddresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setFullName(a.full_name);
                        setStreetAddress(a.street_address);
                        setCity(a.city);
                        setState(a.state);
                        setPostalCode(a.postal_code);
                        if (a.phone) setPhone(a.phone);
                      }}
                      className="text-left p-2 border border-stone-300 rounded bg-white hover:border-stone-900"
                    >
                      <div className="font-medium">{a.full_name}</div>
                      <div className="text-[10px] text-stone-500 truncate">{a.street_address}, {a.city}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-stone-700 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Liam Thorne"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="liam@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-stone-700 font-medium mb-1">Street Address</label>
              <input
                type="text"
                required
                placeholder="100 Market Street, Suite 400"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-stone-700 font-medium mb-1">City</label>
                <input
                  type="text"
                  required
                  placeholder="Seattle"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">State</label>
                <input
                  type="text"
                  required
                  placeholder="WA"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Postal Code</label>
                <input
                  type="text"
                  required
                  placeholder="98101"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Shipping Zone Selector */}
            <div className="pt-2 text-xs">
              <label className="block text-stone-700 font-semibold mb-2">Delivery Method</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {shippingZones.map((z) => (
                  <label
                    key={z.id}
                    className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between ${
                      selectedZoneId === z.id
                        ? 'border-stone-900 bg-stone-50 font-medium'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="shippingZone"
                        checked={selectedZoneId === z.id}
                        onChange={() => setSelectedZoneId(z.id)}
                        className="text-stone-900 focus:ring-0"
                      />
                      <div>
                        <div>{z.name}</div>
                        <div className="text-[10px] text-stone-500">
                          {z.estimated_days_min}–{z.estimated_days_max} business days
                        </div>
                      </div>
                    </div>
                    <div className="font-mono tabular-nums text-xs">
                      {formatMoney(z.base_rate_cents)}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-stone-900 rounded-md hover:bg-stone-800 transition-colors flex items-center gap-2 shadow-sm"
              >
                <span>{loading ? 'Reserving Stock...' : 'Continue to Payment'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: REVIEW & SANDBOX PAYMENT */}
        {step === 'review_and_pay' && activeReservation && (
          <div className="space-y-6 text-xs">
            {/* Server Authoritative Summary */}
            <div className="bg-[#FBFBF9] p-4 rounded-xl border border-stone-200 space-y-2">
              <div className="text-xs font-bold text-stone-900 mb-2">Order Summary</div>
              <div className="flex justify-between text-stone-600">
                <span>Subtotal ({cart?.itemCount} items)</span>
                <span className="font-mono tabular-nums text-stone-900">
                  {formatMoney(activeReservation.subtotalCents)}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Delivery</span>
                <span className="font-mono tabular-nums text-stone-900">
                  {activeReservation.shippingCents === 0 ? 'FREE' : formatMoney(activeReservation.shippingCents)}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Tax (8% standard)</span>
                <span className="font-mono tabular-nums text-stone-900">
                  {formatMoney(activeReservation.taxCents)}
                </span>
              </div>
              {activeReservation.discountCents > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Discount</span>
                  <span className="font-mono tabular-nums">
                    -{formatMoney(activeReservation.discountCents)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-bold text-stone-900">
                <span>Total Amount ({activeReservation.currency})</span>
                <span className="font-mono tabular-nums text-base">
                  {formatMoney(activeReservation.totalCents)}
                </span>
              </div>
            </div>

            {/* Simulated Sandbox Card Interface */}
            <div className="p-4 border border-stone-200 rounded-xl bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-stone-700" />
                  <span className="font-semibold text-stone-900">Sandbox Payment Gateway</span>
                </div>
                <span className="text-[10px] text-stone-500 font-mono">Test Mode Only</span>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">Card Number (Simulated)</label>
                <input
                  type="text"
                  readOnly
                  value="4242 •••• •••• 4242"
                  className="w-full px-3 py-2 border border-stone-300 rounded bg-stone-50 font-mono text-stone-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 mb-1">Expires</label>
                  <input
                    type="text"
                    readOnly
                    value="12/28"
                    className="w-full px-3 py-1.5 border border-stone-300 rounded bg-stone-50 font-mono text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">CVC</label>
                  <input
                    type="text"
                    readOnly
                    value="888"
                    className="w-full px-3 py-1.5 border border-stone-300 rounded bg-stone-50 font-mono text-stone-800"
                  />
                </div>
              </div>
            </div>

            {/* Test Simulation Controls */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={loading || reservationTimeLeft <= 0}
                onClick={() => handleSimulatePayment('success')}
                className="w-full py-3 px-4 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
              >
                <span>{loading ? 'Processing Transaction...' : `Pay ${formatMoney(activeReservation.totalCents)} (Simulate Success)`}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                type="button"
                disabled={loading || reservationTimeLeft <= 0}
                onClick={() => handleSimulatePayment('failure')}
                className="w-full py-2 px-4 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Simulate Card Decline (Test Inventory Release)</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ORDER CONFIRMATION */}
        {step === 'confirmation' && confirmedOrder && (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-stone-900">Thank you for your order!</h3>
              <p className="text-xs text-stone-500 mt-1">
                Order Reference: <span className="font-mono font-bold text-stone-800">{confirmedOrder.orderNumber}</span>
              </p>
              <p className="text-xs text-stone-500">
                A confirmation receipt and tracked dispatch details have been recorded.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 rounded-md hover:bg-stone-200"
              >
                Continue Shopping
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOrderCompleted(activeReservation.orderId);
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-stone-900 rounded-md hover:bg-stone-800 shadow-sm"
              >
                Track Your Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
