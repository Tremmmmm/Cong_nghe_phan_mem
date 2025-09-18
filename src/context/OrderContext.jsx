import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LS_KEY = "ff_orders_v1";
const OrderCtx = createContext(null);

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(orders)); } catch {}
  }, [orders]);

  const create = (payload) => {
    const order = {
      id: "OD" + Date.now().toString(36),
      status: "pending",
      createdAt: Date.now(),
      ...payload,
    };
    setOrders(prev => [order, ...prev]);
    return order;
  };

  const updateStatus = (orderId, status) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const remove = (orderId) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const value = useMemo(() => ({
    orders,
    create,
    updateStatus,
    remove,
    findByUser: (userId, userEmail) =>
      orders.filter(o => o.userId === userId || o.userEmail === userEmail)
  }), [orders]);

  return <OrderCtx.Provider value={value}>{children}</OrderCtx.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrderCtx);
  if (!ctx) throw new Error("useOrders must be used within OrderProvider");
  return ctx;
}
