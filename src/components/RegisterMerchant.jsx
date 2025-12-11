    import React, { useState, useEffect, useMemo } from 'react';
    import { useNavigate, Link } from 'react-router-dom';
    import { registerMerchant } from '../utils/merchantAPI'; 

    const RegisterMerchant = () => {
    const navigate = useNavigate();

    // State tách lẻ địa chỉ để dễ quản lý
    const [formData, setFormData] = useState({
        ownerName: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        
        storeName: '',
        street: '',     
        ward: '',    
        city: 'TP. Hồ Chí Minh',
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // --- 1. CSS STYLES (Responsive Mobile/Desktop) ---
    const styles = useMemo(() => `
        .reg-container {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #f5f5f5;
            padding: 20px;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .reg-card {
            background: #fff;
            width: 100%;
            max-width: 800px; /* Rộng hơn form login để chứa 2 cột */
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .reg-header { text-align: center; margin-bottom: 30px; }
        .reg-title { 
            color: #ee4d2d; /* Màu cam Shopee */
            font-size: 28px; 
            font-weight: 800; 
            margin-bottom: 10px;
        }
        .reg-subtitle { color: #666; font-size: 14px; }
        
        .section-title {
            border-left: 4px solid #ee4d2d;
            padding-left: 12px;
            font-size: 18px;
            font-weight: 700;
            color: #333;
            margin: 25px 0 15px 0;
        }

        /* Grid Layout cho Desktop */
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr; /* 2 cột đều nhau */
            gap: 20px;
        }
        .full-width { grid-column: span 2; } /* Ô nào muốn dài hết dòng */

        .form-group { margin-bottom: 15px; }
        .form-label { 
            display: block; 
            margin-bottom: 8px; 
            font-weight: 600; 
            font-size: 14px; 
            color: #444; 
        }
        .form-input, .form-select {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            transition: border 0.3s;
            box-sizing: border-box; /* Quan trọng để không bị vỡ layout */
        }
        .form-input:focus { border-color: #ee4d2d; outline: none; }

        .btn-submit {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg,#ff8e61,#ee4d2d);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 20px;
            transition: opacity 0.3s;
        }
        .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-submit:hover { opacity: 0.9; }

        .error-msg {
            background: #fff2f0; border: 1px solid #ffccc7;
            color: #ff4d4f; padding: 10px; border-radius: 6px;
            text-align: center; margin-bottom: 20px; font-size: 14px;
        }

        /* --- RESPONSIVE MOBILE --- */
        @media (max-width: 768px) {
            .reg-card { padding: 20px; }
            .form-grid { grid-template-columns: 1fr; gap: 10px; } /* Về 1 cột */
            .full-width { grid-column: span 1; }
            .reg-title { font-size: 22px; }
        }
    `, []);

    // Inject CSS vào thẻ head
    useEffect(() => {
        const id = "style-register-merchant";
        if (!document.getElementById(id)) {
        const s = document.createElement("style");
        s.id = id;
        s.textContent = styles;
        document.head.appendChild(s);
        }
    }, [styles]);

    // Handle Input Change
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
        setError('Mật khẩu nhập lại không khớp!');
        setLoading(false);
        return;
        }

        // --- 2. LOGIC GHÉP ĐỊA CHỈ ---
        // Format: "Số 3 Trương Định, Phường Chợ Quán, Quận 3, TP. Hồ Chí Minh"
        const fullAddress = `${formData.street}, ${formData.ward}, ${formData.city}`;

        // Tạo object dữ liệu chuẩn để gửi đi
        const dataToSubmit = {
        ...formData,
        address: fullAddress, // Ghi đè field address bằng chuỗi đã ghép
        };

        try {
        // Gọi hàm từ merchantAPI.js
        await registerMerchant(dataToSubmit);
        
        alert('Đăng ký thành công! Hãy đăng nhập để thiết lập menu.');
        navigate('/signin');

        } catch (err) {
        console.error(err);
        setError(err.message || 'Lỗi kết nối server');
        } finally {
        setLoading(false);
        }
    };

    return (
        <div className="reg-container">
        <div className="reg-card">
            <div className="reg-header">
            <h1 className="reg-title">Đăng ký Đối tác ShopeeFood (Demo)</h1>
            <p className="reg-subtitle">Điền thông tin để mở gian hàng ngay hôm nay</p>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleSubmit}>
            
            {/* PHẦN 1: THÔNG TIN CHỦ QUÁN */}
            <h3 className="section-title">1. Thông tin chủ quán</h3>
            <div className="form-grid">
                <div className="form-group">
                <label className="form-label">Họ và tên chủ quán</label>
                <input 
                    required name="ownerName" className="form-input" 
                    placeholder="Ví dụ: Nguyễn Văn A" onChange={handleChange} 
                />
                </div>
                <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input 
                    required name="phone" type="tel" className="form-input" 
                    placeholder="0909xxxxxx" onChange={handleChange} 
                />
                </div>
                <div className="form-group full-width">
                <label className="form-label">Email (Tên đăng nhập)</label>
                <input 
                    required name="email" type="email" className="form-input" 
                    placeholder="email@example.com" onChange={handleChange} 
                />
                </div>
                <div className="form-group">
                <label className="form-label">Mật khẩu</label>
                <input 
                    required name="password" type="password" className="form-input" 
                    onChange={handleChange} 
                />
                </div>
                <div className="form-group">
                <label className="form-label">Nhập lại mật khẩu</label>
                <input 
                    required name="confirmPassword" type="password" className="form-input" 
                    onChange={handleChange} 
                />
                </div>
            </div>

            {/* PHẦN 2: THÔNG TIN QUÁN (ĐỊA CHỈ CHI TIẾT) */}
            <h3 className="section-title">2. Thông tin quán & Địa chỉ</h3>
            <div className="form-grid">
                <div className="form-group full-width">
                <label className="form-label">Tên quán</label>
                <input 
                    required name="storeName" className="form-input" 
                    placeholder="Ví dụ: Cơm Tấm Sài Gòn" onChange={handleChange} 
                />
                </div>

                {/* Tách địa chỉ thành 3 phần */}
                <div className="form-group full-width">
                <label className="form-label">Số nhà, Tên đường</label>
                <input 
                    required name="street" className="form-input" 
                    placeholder="Ví dụ: 123 Nguyễn Trãi" onChange={handleChange} 
                />
                </div>
                
                <div className="form-group">
                <label className="form-label">Phường / Xã</label>
                <input 
                    required name="ward" className="form-input" 
                    placeholder="Ví dụ: Phường 2" onChange={handleChange} 
                />
                </div>

                <div className="form-group">
                <label className="form-label">Thành phố</label>
                <select name="city" className="form-select" onChange={handleChange}>
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    {/* <option value="Hà Nội">Hà Nội</option>
                    <option value="Đà Nẵng">Đà Nẵng</option> */}
                </select>
                </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đăng ký ngay'}
            </button>
            
            <div style={{textAlign: 'center', marginTop: '15px', fontSize: '14px'}}>
                <Link to="/signin" style={{color: '#666', textDecoration: 'none'}}> Quay lại đăng nhập</Link>
            </div>
            </form>
        </div>
        </div>
    );
    };

    export default RegisterMerchant;