    // src/pages/AdminServerOrders.jsx

    import React, { useEffect, useMemo, useState } from "react";
    import { useLocation, useSearchParams } from "react-router-dom"; // 💡 Dùng để đọc tham số q
    import { myOrders } from "../utils/orderAPI.js"; 
    import { formatVND } from "../utils/format";

    const VND = (n) => formatVND(n);

    // Status helpers (giữ nguyên hoặc import nếu cần)
    const normalizeStatus = (s = "") => {
    const x = s.toLowerCase();
    if (["delivering"].includes(x)) return "delivery";
    if (["delivered", "completed", "done"].includes(x)) return "done";
    if (["cancelled", "canceled"].includes(x)) return "cancelled";
    if (["accepted", "preparing", "ready"].includes(x)) return "processing";
    if (["new", "pending", "confirmed"].includes(x)) return "order";
    return "order";
    };

    // Component chính
    export default function AdminServerOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || ''; // 💡 Đọc tham số q (email) từ URL

    const fetchOrders = async (queryParam = '') => {
        setLoading(true);
        setError("");
        try {
        // 💡 GỌI API MYORDERS (Không truyền merchantId, nhưng truyền query)
        const res = await myOrders({
            page: 1, 
            limit: 50, // Giới hạn 50 đơn cho Admin
            status: 'all',
            q: queryParam // ⬅️ Lọc theo email người dùng
        }); 

        const data = res?.rows || [];
        // 💡 LỌC BỔ SUNG FRONTEND: Chỉ giữ lại đơn hàng khớp userEmail HOẶC customerName (nếu query là email)
        const strictFiltered = queryParam ? data.filter(order => 
                (order.userEmail && order.userEmail.toLowerCase().includes(queryParam.toLowerCase())) ||
                (order.customerName && order.customerName.toLowerCase().includes(queryParam.toLowerCase()))
        ) : data;
        
        // Sắp xếp đơn hàng mới nhất lên trên
        const sorted = [...strictFiltered].sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
        setOrders(sorted);
        } catch (e) {
        console.error("Fetch Admin Orders Error:", e);
        setError("Lỗi tải dữ liệu đơn hàng hệ thống.");
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders(query);
    }, [query]); // 💡 Reload khi query (email) thay đổi

    const styles = `
        .admin-orders-wrap{max-width:1000px;margin:20px auto;padding:0 16px}
        .admin-orders-wrap h1{font-size:24px;font-weight:800;margin-bottom:10px}
        .order-list{display:flex;flex-direction:column;gap:12px;margin-top:20px}
        .order-card{background:#fff;border:1px solid #eee;border-radius:12px;padding:15px;box-shadow:0 2px 5px rgba(0,0,0,0.05)}
        .order-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
        .order-id{font-weight:700;font-size:16px}
        .order-status{padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700}
        .status-order{background:#ffefe9;color:#c24a26}
        .status-done{background:#eaf7ea;color:#2a7e2a}
        .status-cancelled{background:#fde8e8;color:#b80d0d}
        .order-meta{font-size:13px;color:#666}
        .order-total{font-size:16px;font-weight:800;color:#ff7a59}
        
        @media (max-width: 600px) {
            .admin-orders-wrap { padding: 10px; }
            .order-card { padding: 12px; }
        }
    `;

    return (
        <div className="admin-orders-wrap">
        <style>{styles}</style>
        <h1>Quản lý Đơn hàng Hệ thống</h1>
        
        {query && (
            <p style={{fontSize: 14, color: '#0b68b3'}}>
                Lọc theo Email: <b>{query}</b>
            </p>
        )}

        {loading ? (
            <p>Đang tải đơn hàng...</p>
        ) : error ? (
            <p style={{color: 'red'}}>{error}</p>
        ) : (
            <div className="order-list">
            {orders.length === 0 ? (
                <p>Không tìm thấy đơn hàng nào phù hợp.</p>
            ) : (
                orders.map(order => (
                <div key={order.id} className="order-card">
                    <div className="order-header">
                    <span className="order-id">#{order.id}</span>
                    <span className={`order-status status-${normalizeStatus(order.status)}`}>
                        {order.status}
                    </span>
                    </div>
                    <div className="order-meta">
                    Khách hàng: {order.customerName || order.userEmail}
                    </div>
                    <div className="order-meta">
                    Ngày đặt: {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : '—'}
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 10}}>
                        <span className="order-meta">
                            Merchant: {order.merchantId || '—'}
                        </span>
                        <span className="order-total">
                            {VND(order.finalTotal || order.total)}
                        </span>
                    </div>
                </div>
                ))
            )}
            </div>
        )}
        </div>
    );
    }