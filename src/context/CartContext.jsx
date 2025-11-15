import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

// --- SỬA LỖI QUAN TRỌNG CHO NETLIFY ---
// Sử dụng biến môi trường. Nếu không có (đang chạy local), nó sẽ fallback về localhost.
// Khi deploy lên Netlify, bạn cần cài đặt biến VITE_API_URL trong phần Settings.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5181'; 
const API_ENDPOINT = `${API_BASE_URL}/carts`;

const CartCtx = createContext(null); 

export const useCart = () => {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

const initialState = {
  merchantId: null,
  items: [],
};

const PREFIX = 'ff_cart_v2:';

function ensureAnonId() {
  let id = localStorage.getItem('ff_anon_id');
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem('ff_anon_id', id);
  }
  return id;
}

const lc = s => String(s || '').toLowerCase();

function primaryKeyFor(user) {
  if (user?.email)      return `${PREFIX}ue:${lc(user.email)}`
  if (user?.id != null) return `${PREFIX}uid:${user.id}`
  return `${PREFIX}g:${ensureAnonId()}`;
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  
  const storageKey = useMemo(() => primaryKeyFor(user), [user]);
  const [cart, setCart] = useState(initialState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCart = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_ENDPOINT}/${encodeURIComponent(storageKey)}`);
        if (res.ok) {
          setCart(await res.json());
        } else if (res.status === 404) {
          const newCart = { id: storageKey, ...initialState };
          await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCart) });
          setCart(newCart);
        }
      } catch (e) {
        console.error("Cart load error:", e); // Log lỗi để debug trên Netlify
        setCart(initialState);
      }
      setLoading(false);
    };
    loadCart();
  }, [storageKey]);

  const writeThrough = async (nextState) => {
    const payload = { ...nextState, id: storageKey };
    try {
      await fetch(`${API_ENDPOINT}/${encodeURIComponent(storageKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      toast.show('Lỗi đồng bộ giỏ hàng!', 'error');
    }
  };

  const add = async (item, merchantId) => {
    if (!user) return toast.show('Vui lòng đăng nhập để thêm món', 'error');
    if (!item || !merchantId) return;

    if (cart.merchantId && cart.merchantId !== merchantId) {
      toast.show('Bạn chỉ có thể thêm món từ một nhà hàng!', 'error');
      return;
    }
    const currentMerchantId = cart.merchantId || merchantId;
    
    const idx = cart.items.findIndex(p => p.id === item.id);
    let nextItems;
    if (idx >= 0) {
      nextItems = [...cart.items];
      nextItems[idx] = { ...nextItems[idx], qty: (nextItems[idx].qty || 0) + 1 };
    } else {
      nextItems = [...cart.items, { ...item, qty: 1 }];
    }
    const nextState = { merchantId: currentMerchantId, items: nextItems };

    setCart(nextState); 
    await writeThrough(nextState); 
    toast.show(`Đã thêm ${item.name}`, 'success');
  };

  const dec = async (id) => {
    if (!user) return;
    const nextItems = cart.items.flatMap(p => {
      if (p.id !== id) return [p];
      const q = (p.qty || 0) - 1;
      return q > 0 ? [{ ...p, qty: q }] : [];
    });
    const nextState = nextItems.length > 0 ? { merchantId: cart.merchantId, items: nextItems } : initialState;
    setCart(nextState);
    await writeThrough(nextState);
  };
  
  const remove = async (id) => {
    if (!user) return;
    const nextItems = cart.items.filter(p => p.id !== id);
    const nextState = nextItems.length > 0 ? { merchantId: cart.merchantId, items: nextItems } : initialState;
    setCart(nextState);
    await writeThrough(nextState);
  };
  
  const clear = async () => {
    if (!user) return;
    setCart(initialState);
    await writeThrough(initialState);
  };
  
  const total = useMemo(() => cart.items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0), [cart.items]);
  
  const value = { items: cart.items, merchantId: cart.merchantId, add, dec, remove, clear, total, loading };
  
  return (
    <CartCtx.Provider value={value}>
      {!loading && children}
    </CartCtx.Provider>
  );
}