import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMerchantAdmin } from "../context/MerchantAdminContext.jsx";
import ResLayout from '../admin/ResLayout.jsx'; // Sử dụng ResLayout (Layout cho Restaurant)

export default function AdminMerchantDetail() {
    // Lấy merchantId từ URL
    const { merchantId } = useParams();
    const { selectMerchant, selectedMerchantId } = useMerchantAdmin();
    const [merchantData, setMerchantData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Giả lập việc fetch dữ liệu chi tiết của Merchant
    useEffect(() => {
        setLoading(true);
        // Cập nhật MerchantId đang được Admin xem vào Context
        if (selectedMerchantId !== merchantId) {
            selectMerchant(merchantId);
        }

        // --- Logic Fetch Data ---
        setTimeout(() => {
            setMerchantData({
                id: merchantId,
                name: `Cửa hàng ID: ${merchantId}`,
                address: '123 Đường Công Nghệ, Quận 2',
                status: 'Đang hoạt động',
                // Dữ liệu chi tiết cho dashboard
                revenue: '150,000,000 VND',
                pendingOrders: 5,
            });
            setLoading(false);
        }, 500);

        return () => {
            // Cleanup: Có thể clear selection khi component unmount nếu cần
        }
    }, [merchantId]);

    if (loading) {
        return <div style={{padding: 30, textAlign: 'center'}}>Đang tải dữ liệu Merchant...</div>;
    }

    if (!merchantData) {
        return <div style={{padding: 30, textAlign: 'center'}}>Không tìm thấy Merchant: {merchantId}</div>;
    }

    // Hiển thị nội dung quản lý chi tiết của Merchant
    // Dùng ResLayout (Restaurant Layout) để có giao diện quản lý Merchant (Kitchen)
    return (
        <ResLayout>
            <div style={{padding: 20, maxWidth: 900, margin: '0 auto'}}>
                <h2>Quản lý chi tiết: {merchantData.name}</h2>
                <p style={{color: '#dc2626', fontWeight: 700}}>
                    (Admin Server đang can thiệp vào Merchant này. Mọi thay đổi đều là hành động của Admin.)
                </p>
                <div style={{display: 'flex', gap: 30, marginTop: 20}}>
                    <div>
                        <p><strong>Địa chỉ:</strong> {merchantData.address}</p>
                        <p><strong>Trạng thái:</strong> {merchantData.status}</p>
                    </div>
                    <div>
                        <p><strong>Tổng doanh thu (tháng):</strong> {merchantData.revenue}</p>
                        <p><strong>Đơn hàng đang chờ:</strong> {merchantData.pendingOrders}</p>
                    </div>
                </div>
                {/* Ở đây bạn sẽ đặt các component quản lý Menu, Đơn hàng Live của Merchant */}
                {/* Ví dụ: <MerchantMenuManager merchantId={merchantId} /> */}
            </div>
        </ResLayout>
    );
}