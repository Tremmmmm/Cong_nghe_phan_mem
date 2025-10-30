// File: src/pages/RestaurantMenuManager.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import {
    fetchMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    updateMenuItemStatus, // 💡 API duyệt/từ chối  
} from '../utils/menuAPI.js';
import { formatVND } from '../utils/format.js';

// --- Component Form (Có thể tách ra file riêng) ---
function MenuItemForm({ initialData = {}, onSubmit, onCancel, isSaving }) {
    const [formData, setFormData] = useState({
        name: initialData.name || '',
        desc: initialData.desc || '',
        price: initialData.price || '',
        image: initialData.image || '', // Vẫn lưu URL hoặc path giả lập ở đây
        category: initialData.category || 'single',
    });
// State mới để lưu file được chọn (nếu có)
    const [imageFile, setImageFile] = useState(null); 
    // State mới để chọn kiểu nhập ảnh: 'url' hoặc 'upload'
    const [imageInputType, setImageInputType] = useState('url'); 

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Hàm xử lý khi chọn file ảnh
    const handleFileChange = (e) => {
        const file = e.target.files?.[0]; // Lấy file đầu tiên
        if (file) {
            setImageFile(file); 
            // --- PHẦN GIẢ LẬP UPLOAD ---
        // 1. (BƯỚC THỦ CÔNG) Nhắc nhở/Thông báo:
        alert(`PoC: Bạn cần chép file "${file.name}" vào thư mục 'uploads' ở gốc dự án!`); 

        // 2. Tạo URL giả định trỏ đến http-server
        const imageUrl = `http://localhost:5182/${file.name}`; // Đảm bảo cổng 8080 khớp

        // 3. Cập nhật state formData để lưu URL này vào db.json
        setFormData(prev => ({ ...prev, image: imageUrl })); 
        // ---------------------------

        console.log("Selected file:", file);
        console.log("Generated Image URL for DB:", imageUrl);

    } else {
        setImageFile(null);
        setFormData(prev => ({ ...prev, image: initialData.image || '' }));
    }
};


    const handleSubmit = (e) => {
        e.preventDefault();
        const priceNum = parseFloat(formData.price);
        if (isNaN(priceNum) || priceNum < 0) {
            alert("Vui lòng nhập giá hợp lệ.");
            return;
        }
        
        // 💡 Xử lý logic submit tùy thuộc vào kiểu ảnh
        // Ở PoC này, chúng ta chỉ gửi formData (chứa URL hoặc path giả lập)
        // Trong thực tế, nếu imageFile tồn tại, bạn cần upload file đó lên server trước
        // rồi mới gọi onSubmit với URL ảnh trả về từ server.
        
        onSubmit({ ...formData, price: priceNum }); 
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h3 style={{ marginTop: 0 }}>{initialData.id ? 'Chỉnh sửa Món ăn' : 'Thêm Món ăn Mới'}</h3>
                <form onSubmit={handleSubmit}>
                    {/* Input Name */}
                    <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Tên món:</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} style={inputStyle} required />
                    </div>
                    {/* Input Description */}
                    <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Mô tả:</label>
                        <textarea name="desc" value={formData.desc} onChange={handleChange} style={{...inputStyle, height: '60px'}} />
                    </div>
                    {/* Input Price */}
                    <div style={fieldGroupStyle}>
                         <label style={labelStyle}>Giá (VNĐ):</label>
                         <input type="number" name="price" value={formData.price} onChange={handleChange} style={inputStyle} required min="0" />
                    </div>
                     {/* Input Image URL */}
                    <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Hình ảnh:</label>
                        {/* Radio buttons để chọn kiểu nhập */}
                        <div style={{ marginBottom: '10px', display: 'flex', gap: '15px' }}>
                            <label>
                                <input 
                                    type="radio" 
                                    name="imageType" 
                                    value="url" 
                                    checked={imageInputType === 'url'} 
                                    onChange={() => setImageInputType('url')} 
                                /> Nhập URL
                            </label>
                            <label>
                                <input 
                                    type="radio" 
                                    name="imageType" 
                                    value="upload" 
                                    checked={imageInputType === 'upload'} 
                                    onChange={() => setImageInputType('upload')} 
                                /> Tải file lên
                            </label>
                        </div>

                        {/* Hiển thị input tương ứng */}
                        {imageInputType === 'url' ? (
                            <input 
                                type="url" 
                                name="image" 
                                value={formData.image} // Dùng value từ state
                                onChange={handleChange} // Dùng handler chung
                                style={inputStyle} 
                                placeholder="https://example.com/image.jpg" 
                            />
                        ) : (
                            <input 
                                type="file" 
                                name="imageFile" // Tên khác để không ghi đè state formData.image ngay lập tức
                                accept="image/png, image/jpeg, image/webp" // Chỉ chấp nhận ảnh
                                onChange={handleFileChange} // Dùng handler riêng cho file
                                style={inputStyle} 
                            />
                        )}
                        {/* Hiển thị tên file đã chọn (nếu có) */}
                        {imageFile && imageInputType === 'upload' && (
                            <p style={{ fontSize: 12, color: '#555', marginTop: 5 }}>Đã chọn: {imageFile.name}</p>
                        )}
                         {/* Hiển thị ảnh preview nhỏ (nếu là URL hợp lệ) */}
                        {formData.image && formData.image.startsWith('http') && imageInputType === 'url' && (
                            <img src={formData.image} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px', marginTop: '10px', border: '1px solid #eee' }} />
                        )}
                    </div>
                    {/* Select Category */}
                    <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Loại:</label>
                        <select name="category" value={formData.category} onChange={handleChange} style={inputStyle}>
                            <option value="single">Món lẻ</option>
                            <option value="combo">Combo</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                        <button type="button" onClick={onCancel} style={{ ...buttonStyle, background: '#ccc' }} disabled={isSaving}>Hủy</button>
                        <button type="submit" style={{ ...buttonStyle, background: '#27ae60' }} disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : (initialData.id ? 'Lưu thay đổi' : 'Thêm món')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
// --- Hết Component Form ---

// --- Component Chính ---
export default function RestaurantMenuManager() {
    const [menuItems, setMenuItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); // Trạng thái khi gọi API CUD
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // Item đang được sửa
    const toast = useToast();

// 💡 --- State MỚI cho Lọc và Phân trang ---
    const [filterCategory, setFilterCategory] = useState('all'); // 'all', 'single', 'combo'
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10; // Số sản phẩm mỗi trang

// --- Load Menu Items ---
    const loadMenuItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchMenuItems(); // Lấy tất cả (cả pending)
            setMenuItems(data.sort((a,b) => (a.name || '').localeCompare(b.name || ''))); // Sắp xếp theo tên
        } catch (error) {
            toast.show('❌ Lỗi tải danh sách món ăn.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadMenuItems();
    }, [loadMenuItems]);

    // --- Xử lý CUD ---
    const handleAddItem = async (newItemData) => {
        setIsSaving(true);
        try {
            const newItem = await createMenuItem(newItemData);
            setMenuItems(prev => [...prev, newItem].sort((a,b) => (a.name || '').localeCompare(b.name || '')));
            toast.show(`⏳ Đã thêm "${newItem.name}". Chờ Admin duyệt.`, 'info');
            setShowForm(false);
        } catch (error) {
            toast.show('❌ Lỗi thêm món ăn.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditItem = (item) => {
        setEditingItem(item);
        setShowForm(true);
    };

    const handleUpdateItem = async (updatedData) => {
        if (!editingItem) return;
        setIsSaving(true);
        try {
            const updated = await updateMenuItem(editingItem.id, updatedData);
            setMenuItems(prev => prev.map(item => item.id === editingItem.id ? updated : item)
                                    .sort((a,b) => (a.name || '').localeCompare(b.name || '')));
            toast.show(`⏳ Đã cập nhật "${updated.name}". Chờ Admin duyệt lại.`, 'info');
            setShowForm(false);
            setEditingItem(null);
        } catch (error) {
            toast.show('❌ Lỗi cập nhật món ăn.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteItem = async (item) => {
        if (!window.confirm(`Bạn có chắc muốn xóa món "${item.name}" không?`)) return;
        setIsSaving(true); // Có thể dùng loading riêng cho từng item
        try {
            await deleteMenuItem(item.id);
            setMenuItems(prev => prev.filter(i => i.id !== item.id));
            toast.show(`✅ Đã xóa món "${item.name}".`, 'success');
        } catch (error) {
            toast.show('❌ Lỗi xóa món ăn.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- 💡 Chức năng DUYỆT/TỪ CHỐI (Giả lập Admin) ---
    const handleApprove = async (itemId) => {
            setIsSaving(true);
            try {
                const updated = await updateMenuItemStatus(itemId, 'approved');
                setMenuItems(prev => prev.map(item => item.id === itemId ? updated : item));
                toast.show(`✅ Đã DUYỆT món ID: ${itemId}.`, 'success');
            } catch (error) {
                toast.show('❌ Lỗi duyệt món ăn.', 'error');
            } finally {
                setIsSaving(false);
            }
        };
        const handleReject = async (itemId) => {
            setIsSaving(true);
            try {
                const updated = await updateMenuItemStatus(itemId, 'rejected');
                setMenuItems(prev => prev.map(item => item.id === itemId ? updated : item));
                toast.show(`❌ Đã TỪ CHỐI món ID: ${itemId}.`, 'warning');
            } catch (error) {
                    toast.show('❌ Lỗi từ chối món ăn.', 'error');
            } finally {
                setIsSaving(false);
            }
    };
// const handleToggleAvailability = async (item) => {
//         const newState = !(item.isAvailable ?? true); // Lấy trạng thái ngược lại (mặc định là true nếu chưa có)
//         setIsSaving(true); // Có thể dùng loading riêng
//         try {
//             const updated = await toggleMenuItemAvailability(item.id, newState);
//             // Cập nhật state cục bộ
//             setMenuItems(prev => prev.map(i => i.id === item.id ? updated : i)
//                                     .sort((a,b) => (a.name || '').localeCompare(b.name || '')));
//             toast.show(`✅ Món "${item.name}" đã được ${newState ? 'HIỂN THỊ LẠI' : 'TẠM ẨN'}.`, 'success');
//         } catch (error) {
//             toast.show('❌ Lỗi cập nhật trạng thái ẩn/hiện.', 'error');
//         } finally {
//             setIsSaving(false);
//         }
//     };

// 💡 --- Logic Lọc và Phân trang ---
    // 1. Lọc danh sách món ăn dựa trên filterCategory
    const filteredItems = useMemo(() => {
        if (filterCategory === 'all') {
            return menuItems; // Trả về tất cả nếu filter là 'all'
        }
        return menuItems.filter(item => item.category === filterCategory);
    }, [menuItems, filterCategory]); // Tính toán lại khi menuItems hoặc filter thay đổi

    // 2. Tính toán phân trang dựa trên danh sách ĐÃ LỌC
    const totalItems = filteredItems.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // 3. Lấy ra các món ăn cho trang hiện tại
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredItems.slice(startIndex, endIndex);
    }, [filteredItems, currentPage]); // Tính toán lại khi danh sách lọc hoặc trang thay đổi

    // --- 💡 Hàm xử lý MỚI cho Lọc và Phân trang ---
    const handleFilterChange = (category) => {
        setFilterCategory(category);
        setCurrentPage(1); // Reset về trang 1 khi đổi bộ lọc
    };

    const handleNextPage = () => {
        // Không đi quá trang cuối
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    const handlePrevPage = () => {
        // Không lùi về trước trang 1
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    // --- Render ---
    if (isLoading) {
        return <div style={{ padding: 30, textAlign: 'center' }}>Đang tải thực đơn...</div>;
    }

    return (
        <div style={styles.wrap}>
            <div style={styles.header}>
                <h1 style={{ margin: 0 }}>Quản lý Thực đơn</h1>
                <button
                    style={{ ...buttonStyle, background: '#f58134cc' }}
                    onClick={() => { setEditingItem(null); setShowForm(true); }}
                    disabled={isSaving}
                >
                    + Thêm món mới
                </button>
            </div>
{/* 💡 --- GIAO DIỆN BỘ LỌC MỚI --- */}
            <div style={styles.filterContainer}>
                <button
                    style={filterCategory === 'all' ? {...buttonStyle, ...styles.filterButton, ...styles.filterActive} : {...buttonStyle, ...styles.filterButton}}
                    onClick={() => handleFilterChange('all')}
                >
                    Tất cả ({menuItems.length})
                </button>
                <button
                    style={filterCategory === 'single' ? {...buttonStyle, ...styles.filterButton, ...styles.filterActive} : {...buttonStyle, ...styles.filterButton}}
                    onClick={() => handleFilterChange('single')}
                >
                    Món lẻ ({menuItems.filter(i => i.category === 'single').length})
                </button>
                <button
                    style={filterCategory === 'combo' ? {...buttonStyle, ...styles.filterButton, ...styles.filterActive} : {...buttonStyle, ...styles.filterButton}}
                    onClick={() => handleFilterChange('combo')}
                >
                    Combo ({menuItems.filter(i => i.category === 'combo').length})
                </button>
            </div>

            {/* 💡 --- DANH SÁCH MÓN ĂN (Dùng paginatedItems) --- */}
            {paginatedItems.length === 0 ? (
                <p style={{textAlign: 'center', padding: '20px'}}>
                    {filterCategory === 'all' ? 'Chưa có món ăn nào.' : 'Không có món ăn nào trong danh mục này.'}
                </p>
            ) : (
                <div style={styles.list}>
                    {/* 💡 Map qua paginatedItems thay vì menuItems */}
                    {paginatedItems.map(item => { 
                        // const isCurrentlyAvailable = item.isAvailable ?? true; // Đã bỏ
                        return (
                            <div key={item.id} style={styles.itemCard}>
                                {/* ... (Render Card giữ nguyên) ... */}
                                <img src={item.image || '/assets/images/menu/placeholder.png'} alt={item.name} style={styles.itemImage} onError={(e)=>{e.target.src='/assets/images/menu/placeholder.png'}}/>
                                <div style={styles.itemInfo}>
                                    <div style={styles.itemRow}>
                                        <strong style={{ fontSize: 16 }}>{item.name || '(Chưa có tên)'}</strong>
                                        <div> 
                                            <span style={{...styles.itemStatus, ...statusStyles[item.status || 'pending']}}>
                                                {item.status === 'approved' ? 'Đã duyệt' : (item.status === 'rejected' ? 'Bị từ chối' : 'Chờ duyệt')}
                                            </span>
                                        </div>
                                    </div>
                                    <p style={styles.itemDesc}>{item.desc || 'Chưa có mô tả'}</p> 
                                    <div style={styles.itemRow}>
                                        <span style={{ fontWeight: 600 }}>{formatVND(item.price || 0)}</span>
                                        <span style={{ fontSize: 12, color: '#666' }}>Loại: {item.category}</span>
                                    </div>
                                </div>
                                <div style={styles.itemActions}> 
                                    {item.status === 'pending' && (
                                        <>
                                            <button onClick={() => handleApprove(item.id)} style={{...buttonStyle, background:'#2ecc71', fontSize: 12, padding: '5px 8px'}} disabled={isSaving}>Duyệt</button>
                                            <button onClick={() => handleReject(item.id)} style={{...buttonStyle, background:'#f39c12', fontSize: 12, padding: '5px 8px'}} disabled={isSaving}>Từ chối</button>
                                        </>
                                    )} 
                                    <button onClick={() => handleEditItem(item)} style={{...buttonStyle, fontSize:12, padding:"4px 10px", borderRadius:999,background:"#c8e6faff", color:"#2090daff", border:"1px solid #8dc7ebff"}} disabled={isSaving}>Sửa</button>
                                    <button onClick={() => handleDeleteItem(item)} style={{...buttonStyle, fontSize:12, padding:"4px 10px", borderRadius:999,background:"#ffe6e6ff", color:"#d40606ff", border:"1px solid #ff8f8fff"}} disabled={isSaving}>Xóa</button>
                                </div>
                            </div>  
                        );  
                    })}  
                </div>  
            )}  

            {/* 💡 --- GIAO DIỆN PHÂN TRANG MỚI --- */}
            {/* Chỉ hiển thị phân trang nếu có nhiều hơn 1 trang */}
            {totalPages > 1 && (
                <div style={styles.paginationContainer}>
                    <button 
                        onClick={handlePrevPage} 
                        disabled={currentPage === 1} 
                        style={{...buttonStyle, ...styles.pageButton}}
                    >
                        ‹ Trước
                    </button>
                    <span style={styles.paginationText}>
                        Trang {currentPage} / {totalPages}
                    </span>
                    <button 
                        onClick={handleNextPage} 
                        disabled={currentPage === totalPages} 
                        style={{...buttonStyle, ...styles.pageButton}}
                    >
                        Sau ›
                    </button>
                </div>
            )}

            {/* Form Thêm/Sửa */}
            {showForm && (
                <MenuItemForm
                    initialData={editingItem || {}}
                    onSubmit={editingItem ? handleUpdateItem : handleAddItem}
                    onCancel={() => { setShowForm(false); setEditingItem(null); }}
                    isSaving={isSaving}
                />
            )}
        </div>  
    );  
}

// --- Styles (Nội tuyến) ---
const styles = {
    wrap: { maxWidth: 900, margin: '24px auto', padding: 20 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    list: { display: 'grid', gap: 15 },
    itemCard: { display: 'flex', gap: 15, padding: 15, background: '#fff', border: '1px solid #eee', borderRadius: 8 },
    itemImage: { width: 80, height: 80, objectFit: 'cover', borderRadius: 6, background: '#f0f0f0' },
    itemInfo: { flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
    itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    itemDesc: { fontSize: 13, color: '#555', margin: '5px 0', flexGrow: 1 },
    itemActions: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', justifyContent: 'center' },
    itemStatus: { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999 },
    // 💡 --- STYLES MỚI ---
    addButton: { background: '#3498db' },
    filterContainer: { display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '20px' },
    filterButton: { background: '#f0f0f0', color: '#555', border: '1px solid #ddd' },
    filterActive: { background: '#3498db', color: '#fff', border: '1px solid #2980b9', fontWeight: 'bold' },
    paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '30px', padding: '20px 0', borderTop: '1px solid #eee' },
    paginationText: { fontWeight: '600', fontSize: '14px', color: '#555' },
    pageButton: { background: '#f9f9f9', color: '#444', border: '1px solid #ddd' },
    // itemAvailability: { // Style mới
    //     fontSize: 11,
    //     fontWeight: 600,
    //     padding: '3px 8px',
    //     borderRadius: 999,
    //     marginRight: '8px',
    //     border: '1px solid currentColor', // Viền theo màu chữ 
    // },
};
const statusStyles = {
    pending: { background: '#fffbe6', color: '#b45309', border: '1px solid #fde68a'},
    approved: { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' },
    rejected: { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' },
};
const modalOverlayStyle = { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'grid', placeItems:'center', zIndex:1000 };
const modalContentStyle = { background:'#fff', padding:'25px', borderRadius:'12px', width:'100%', maxWidth:'500px', boxShadow:'0 5px 15px rgba(0,0,0,0.3)' };
const fieldGroupStyle = { marginBottom: 15 };
const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 5, color: '#555' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14 };
const buttonStyle = { padding: '8px 15px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'background-color 0.2s' };