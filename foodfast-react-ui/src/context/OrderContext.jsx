import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createSession, closeSession as apiCloseSession } from "../utils/orderAPI";

// GIỮ NGUYÊN key cũ của bạn cho orders
const LS_KEY_ORDERS = "ff_orders_v1";

// THÊM: key quản lý session + order đang focus
const LS_KEY_SESSION = "ff_session_v1";
const LS_KEY_CURRENT_ORDER = "ff_current_order";

const OrderCtx = createContext(null);

export function OrderProvider({ children }) {
  // ====== PHẦN CŨ: orders trong localStorage (giữ nguyên) ======
  const [orders, setOrders] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_ORDERS)) || []; }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY_ORDERS, JSON.stringify(orders)); } catch {}
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

  // ====== PHẦN MỚI: quản lý SESSION & currentOrderId cho flow "user đóng session" ======
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_SESSION)) || null; }
    catch { return null; }
  });

  const [currentOrderId, setCurrentOrderId] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_CURRENT_ORDER)) || null; }
    catch { return null; }
  });

  useEffect(() => {
    if (session) localStorage.setItem(LS_KEY_SESSION, JSON.stringify(session));
    else localStorage.removeItem(LS_KEY_SESSION);
  }, [session]);

  useEffect(() => {
    if (currentOrderId) localStorage.setItem(LS_KEY_CURRENT_ORDER, JSON.stringify(currentOrderId));
    else localStorage.removeItem(LS_KEY_CURRENT_ORDER);
  }, [currentOrderId]);

  /** Đảm bảo có session mở (gọi json-server) */
  const ensureSession = async () => {
    if (session?.status === "open") return session;
    const s = await createSession();
    setSession(s);
    return s;
  };

  /** User chủ động đóng session */
  const closeSession = async () => {
    if (!session?.id) return null;
    const res = await apiCloseSession(session.id);
    setSession(res);
    return res;
  };

  /** Lưu order vừa tạo để màn Confirm biết */
  const markOrderAsCurrent = (orderId) => setCurrentOrderId(orderId || null);

  const value = useMemo(() => ({
    // cũ
    orders,
    create,
    updateStatus,
    remove,
    findByUser: (userId, userEmail) =>
      orders.filter(o => o.userId === userId || o.userEmail === userEmail),

    // mới (session)
    session,
    ensureSession,
    closeSession,
    currentOrderId,
    markOrderAsCurrent,
  }), [orders, session, currentOrderId]);

  return <OrderCtx.Provider value={value}>{children}</OrderCtx.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrderCtx);
  if (!ctx) throw new Error("useOrders must be used within OrderProvider");
  return ctx;
}

// Alias để các file cũ/mới đều dùng được
export function useOrderCtx() {
  return useOrders();
}
