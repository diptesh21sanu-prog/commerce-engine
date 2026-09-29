import React, { useState } from 'react';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { MessageSquare, X, Send, Sparkles, Check, ShoppingBag, ArrowRight } from 'lucide-react';
import { getCategoryFallbackImage } from '../utils/imageFallback';

interface AiAssistantProps {
  onSelectProduct: (productId: string) => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ onSelectProduct }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Array<{
    sender: 'user' | 'assistant';
    text: string;
    products?: any[];
    cartProposal?: { id: string; productTitle: string; priceCents: number; sku: string };
  }>>([
    {
      sender: 'assistant',
      text: "Hello! How can I help you shop today? You can ask me to find products, compare items, check your order status, or explain our shipping and return policies.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [confirmedProposals, setConfirmedProposals] = useState<Record<string, boolean>>({});

  const { refreshCart } = useCart();
  const { formatMoney } = useCurrency();
  const { showToast } = useToast();

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg = textToSend.trim();
    setInputMessage('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const data = await api.sendAiChat(userMsg);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: data.reply,
          products: data.products,
          cartProposal: data.cartProposal,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: "I'm having trouble retrieving recommendations right now. You can continue browsing products using our search bar and categories.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProposal = async (proposalId: string) => {
    try {
      await api.confirmAiCartProposal(proposalId);
      setConfirmedProposals((prev) => ({ ...prev, [proposalId]: true }));
      await refreshCart();
      showToast('Item added to your cart!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not add item to cart', 'error');
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-stone-900 hover:bg-stone-800 text-white p-3.5 rounded-full shadow-xl flex items-center gap-2 text-xs font-semibold transition-transform hover:scale-105"
          aria-label="Open Shopping Assistant"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span className="hidden sm:inline">Ask Shopping Assistant</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-40 w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col h-[520px]">
          {/* Header */}
          <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center border border-stone-700">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Shopping Assistant</h3>
                <span className="text-[10px] text-stone-400 block">Product Discovery & Support</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="bg-[#FAF9F7] px-3 py-2 border-b border-stone-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
            <button
              onClick={() => handleSend("Show me mechanical watches")}
              className="px-2.5 py-1 bg-white border border-stone-200 rounded-full hover:border-stone-400 whitespace-nowrap text-stone-700 font-medium"
            >
              Mechanical Watches
            </button>
            <button
              onClick={() => handleSend("What is the return policy?")}
              className="px-2.5 py-1 bg-white border border-stone-200 rounded-full hover:border-stone-400 whitespace-nowrap text-stone-700 font-medium"
            >
              Return Policy
            </button>
            <button
              onClick={() => handleSend("Where is my order?")}
              className="px-2.5 py-1 bg-white border border-stone-200 rounded-full hover:border-stone-400 whitespace-nowrap text-stone-700 font-medium"
            >
              Order Status
            </button>
          </div>

          {/* Message History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-stone-900 text-white rounded-br-none'
                      : 'bg-stone-100 text-stone-800 rounded-bl-none'
                  }`}
                >
                  <p>{m.text}</p>

                  {/* Explicit Cart Proposal Action (Safe User Confirmation Required) */}
                  {m.cartProposal && (
                    <div className="mt-3 pt-2 border-t border-stone-200">
                      {confirmedProposals[m.cartProposal.id] ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                          <Check className="w-3.5 h-3.5" />
                          <span>Added to your cart!</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConfirmProposal(m.cartProposal!.id)}
                          className="w-full py-1.5 px-3 bg-stone-900 text-white rounded font-medium text-[11px] hover:bg-stone-800 flex items-center justify-center gap-1.5"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>Confirm & Add to Cart</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Recommended Product Cards */}
                {m.products && m.products.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-[95%]">
                    {m.products.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white border border-stone-200 rounded-lg p-2 flex flex-col justify-between shadow-2xs hover:border-stone-400 transition-colors"
                      >
                        <div>
                          <img
                            src={p.image || p.primary_image || `/api/v1/images/products/${p.id}`}
                            alt={p.name || p.title}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getCategoryFallbackImage(p.category_slug || p.category_name || p.category);
                            }}
                            className="w-full aspect-[4/3] object-cover rounded mb-1 bg-stone-100"
                          />
                          <div className="text-[10px] text-stone-400 font-medium truncate">{p.seller || p.seller_name || p.brand}</div>
                          <div className="font-semibold text-stone-900 line-clamp-1 text-[11px]" title={p.name || p.title}>{p.name || p.title}</div>
                          <div className="text-[10px] text-stone-500 font-medium truncate">{p.category || p.category_name}</div>
                          <div className="font-bold text-stone-900 mt-0.5 tabular-nums text-[11px]">
                            {formatMoney(p.price || p.min_price_cents)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectProduct(p.id);
                          }}
                          className="mt-2 w-full py-1 text-[10px] font-semibold bg-stone-100 text-stone-800 rounded hover:bg-stone-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>View Item</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-stone-400 text-xs pl-2">
                <span className="w-2 h-2 rounded-full bg-stone-400 animate-pulse" />
                <span>Assistant is researching...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-stone-200 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about our products..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
