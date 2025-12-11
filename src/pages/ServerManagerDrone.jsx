import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

// 💡 CẤU HÌNH API
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5181';

// Component Icon Drone (SVG)
const DroneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
    <path d="M22,2 L20,2 C18.9,2 18,2.9 18,4 L18,5.1 L13.9,8.2 C13.3,8.1 12.7,8 12,8 C11.3,8 10.7,8.1 10.1,8.2 L6,5.1 L6,4 C6,2.9 5.1,2 4,2 L2,2 C0.9,2 0,2.9 0,4 L0,6 C0,7.1 0.9,8 2,8 L4,8 C4.7,8 5.4,7.6 5.7,7.1 L9.2,9.7 C8.5,10.9 8.1,12.4 8.1,14 L5.7,16.9 C5.4,16.4 4.7,16 4,16 L2,16 C0.9,16 0,16.9 0,18 L0,20 C0,21.1 0.9,22 2,22 L4,22 C5.1,22 6,21.1 6,20 L6,18.9 L10.1,15.8 C10.7,15.9 11.3,16 12,16 C12.7,16 13.3,15.9 13.9,15.8 L18,18.9 L18,20 C18,21.1 18.9,22 20,22 L22,22 C23.1,22 24,21.1 24,20 L24,18 C24,16.9 23.1,16 22,16 L20,16 C19.3,16 18.6,16.4 18.3,16.9 L14.8,14 C15.5,12.4 15.9,10.9 15.9,9.7 L18.3,7.1 C18.6,7.6 19.3,8 20,8 L22,8 C23.1,8 24,7.1 24,6 L24,4 C24,2.9 23.1,2 22,2 Z M12,14 C10.9,14 10,13.1 10,12 C10,10.9 10.9,10 12,10 C13.1,10 14,10.9 14,12 C14,13.1 13.1,14 12,14 Z"/>
  </svg>
);

// --------------------------------------------------------
// 1. DATA FETCHING
// --------------------------------------------------------
async function fetchDroneEcosystem() {
    const [dronesRes, missionsRes, ordersRes, merchantsRes] = await Promise.all([
        fetch(`${API_BASE}/drones`),
        fetch(`${API_BASE}/droneMissions`),
        fetch(`${API_BASE}/orders`),
        fetch(`${API_BASE}/restaurantSettings`) 
    ]);

    const drones = await dronesRes.json();
    const missions = await missionsRes.json();
    const orders = await ordersRes.json();
    const merchants = await merchantsRes.json();

    return { drones, missions, orders, merchants };
}

// --------------------------------------------------------
// 2. UI COMPONENTS
// --------------------------------------------------------

const StatCard = ({ title, count, icon, color, isActive, onClick }) => (
    <div 
        className={`stat-card ${isActive ? 'active' : ''}`} 
        onClick={onClick}
        style={{ borderLeft: `4px solid ${color}` }}
    >
        <div className="stat-icon" style={{ background: `${color}20`, color: color }}>{icon}</div>
        <div className="stat-info">
            <div className="stat-count" style={{ color: color }}>{count}</div>
            <div className="stat-title">{title}</div>
        </div>
    </div>
);

const DroneHistoryModal = ({ drone, onClose }) => {
    if (!drone) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Drone ID: <span style={{color:'#e67e22'}}>{drone.id}</span></h3>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>
                <div className="modal-body">
                    <div className="drone-info-row">
                        <div className="info-item">
                            <label>Model</label>
                            <span>{drone.model}</span>
                        </div>
                        <div className="info-item">
                            <label>Trạng thái</label>
                            <span style={{fontWeight:'bold', color: drone.status === 'BUSY' ? '#2980b9' : (drone.status === 'MAINTENANCE' ? '#e74c3c' : 'green')}}>
                                {drone.status}
                            </span>
                        </div>
                        <div className="info-item">
                            <label>Tổng chuyến bay</label>
                            <span>{drone.totalFlights}</span>
                        </div>
                    </div>
                    
                    <h4 style={{marginTop: 20, marginBottom: 10, fontSize: 16}}>Lịch sử vận đơn</h4>
                    <div className="table-scroll">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>Mã Đơn</th>
                                    <th>Thời gian đi</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drone.history.length === 0 ? (
                                    <tr><td colSpan="3" style={{textAlign:'center', color:'#999'}}>Chưa có dữ liệu bay</td></tr>
                                ) : (
                                    drone.history.map((m, idx) => (
                                        <tr key={idx}>
                                            <td><b>{m.orderId}</b></td>
                                            <td>{m.startTime ? new Date(m.startTime).toLocaleString('vi-VN') : '---'}</td>
                                            <td>
                                                <span className={`status-pill ${m.status}`}>
                                                    {m.status === 'in_progress' ? 'Đang bay ✈️' : (m.status === 'delivered' ? 'Hoàn tất ✅' : m.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --------------------------------------------------------
// 3. MAIN COMPONENT
// --------------------------------------------------------
export default function ServerManagerDrone() {
    const { isSuperAdmin } = useAuth();
    const [fleetData, setFleetData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); 
    const [selectedDrone, setSelectedDrone] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const { drones, missions, orders, merchants } = await fetchDroneEcosystem();
            
            // =================================================================================
            // 🆕 PHẦN 1: XỬ LÝ LỊCH SỬ TỨC THÌ (Optimistic History)
            // =================================================================================
            
            // Tìm các đơn đã GIAO XONG nhưng chưa có mission trong DB
            const completedDroneOrders = orders.filter(o => 
                ['delivered', 'completed', 'done'].includes((o.status || '').toLowerCase()) && 
                o.deliveryMode === 'DRONE' && 
                !missions.find(m => m.orderId === o.id) 
            );

            // Tạo mission lịch sử tạm thời để hiển thị ngay
            const newLocalMissions = [];
            if (completedDroneOrders.length > 0) {
                // Chia đều lịch sử cho các drone (trừ drone đang bảo trì nếu muốn logic chặt hơn)
                // Ở đây gán ngẫu nhiên cho DR-001 -> DR-004 để dữ liệu rải đều
                const availableDrones = drones.filter(d => d.status !== 'MAINTENANCE');
                
                completedDroneOrders.forEach((o, index) => {
                    const targetDrone = availableDrones[index % availableDrones.length] || drones[0];
                    
                    const newMission = {
                        id: `his_${o.id}`,
                        droneId: targetDrone.id, 
                        orderId: o.id,
                        status: 'delivered',
                        startTime: o.createdAt,
                        endTime: o.updatedAt || new Date().toISOString(),
                        vehicle: 'drone',
                        speedKmh: 35,
                        eta: 0,
                        merchantName: 'Unknown', // Sẽ được map lại bên dưới
                        isHistory: true
                    };
                    newLocalMissions.push(newMission);

                    // Lưu ngầm vào DB
                    fetch(`${API_BASE}/droneMissions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newMission)
                    }).catch(e => console.error(e));
                });
            }

            // Gộp tất cả mission lại
            const allMissions = [...missions, ...newLocalMissions];

            // =================================================================================
            // 🆕 PHẦN 2: TÍNH TOÁN TRẠNG THÁI & AUTO-DISPATCH
            // =================================================================================

            // Lấy danh sách đơn hàng ĐANG CẦN GIAO
            const activeDroneOrders = orders.filter(o => {
                const s = (o.status || '').toLowerCase();
                const m = (o.deliveryMode || '').toUpperCase();
                return ['delivering', 'shipping', 'on_way'].includes(s) && m === 'DRONE';
            });

            // Copy ra để gán dần
            const unassignedOrders = [...activeDroneOrders];

            const enrichedDrones = drones.map(drone => {
                // A. Lọc lịch sử của riêng Drone này (Từ mảng tổng hợp)
                const droneHistory = allMissions
                    .filter(m => m.droneId === drone.id)
                    .map(m => {
                        const order = orders.find(o => o.id === m.orderId);
                        const merchantInfo = merchants.find(store => store.id === order?.merchantId);
                        return {
                            ...m,
                            orderDetail: order,
                            merchantName: merchantInfo?.storeName || order?.merchantId || 'Unknown',
                        };
                    })
                    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)); // Mới nhất lên đầu

                // B. Tìm xem Drone này có đang bận mission nào "chính thức" không?
                let activeMission = droneHistory.find(m => 
                    ['in_progress', 'flying', 'delivering'].includes(m.status)
                );

                // C. Tính số chuyến thực tế (Đã bao gồm lịch sử vừa tạo ở Phần 1)
                let realFlightCount = droneHistory.length;
                
                // D. AUTO-DISPATCH (Gán đơn nếu rảnh)
                // Điều kiện: Chưa có mission VÀ Còn đơn chờ VÀ (Số chuyến <= 5 HOẶC Status gốc không phải Maintenance)
                // Lưu ý: Nếu DB đang set cứng MAINTENANCE thì không gán. Nếu DB là IDLE mà flight > 5 thì vẫn cảnh báo sau.
                
                const isMaintenanceMode = drone.status === 'MAINTENANCE' || realFlightCount > 5;

                if (!activeMission && unassignedOrders.length > 0 && !isMaintenanceMode) {
                    const orderToAssign = unassignedOrders.shift(); // Lấy 1 đơn ra
                    
                    // Kiểm tra xem đơn này có mission mồ côi không
                    const orphanMission = allMissions.find(m => m.id === orderToAssign.droneMissionId);

                    if (orphanMission) {
                        activeMission = { 
                            ...orphanMission, 
                            status: 'in_progress', 
                            orderDetail: orderToAssign,
                            merchantName: 'Loading...', // Sẽ map lại ngay dưới
                            isSimulation: true 
                        };
                    } else {
                        // Tạo mission giả lập mới hoàn toàn
                        activeMission = {
                            id: `sim_${orderToAssign.id}`,
                            orderId: orderToAssign.id,
                            status: 'in_progress',
                            startTime: orderToAssign.updatedAt || new Date().toISOString(),
                            orderDetail: orderToAssign,
                            isSimulation: true
                        };
                    }
                    
                    // Đẩy vào lịch sử hiển thị
                    droneHistory.unshift(activeMission);
                    // Tăng số chuyến lên 1 vì vừa gán thêm nhiệm vụ
                    realFlightCount++; 
                }

                // E. Bổ sung thông tin Merchant cho Active Mission
                if (activeMission) {
                    const order = activeMission.orderDetail || orders.find(o => o.id === activeMission.orderId);
                    const merchantInfo = merchants.find(m => m.id === order?.merchantId);
                    activeMission.merchantName = merchantInfo?.storeName || order?.merchantId || 'Unknown';
                    activeMission.orderDetail = order;
                }

                // F. Quyết định trạng thái hiển thị cuối cùng
                let computedStatus = 'IDLE';
                
                if (activeMission) {
                    computedStatus = 'BUSY';
                } else if (realFlightCount > 5) {
                    computedStatus = 'MAINTENANCE';
                }

                return {
                    ...drone,
                    status: computedStatus, 
                    currentMission: activeMission || null,
                    history: droneHistory,
                    // 💡 SỬA: Dùng chính xác biến realFlightCount đã tính ở trên
                    totalFlights: realFlightCount, 
                    maintenanceAlert: realFlightCount > 5
                };
            });

            setFleetData(enrichedDrones);
        } catch (e) {
            console.error("Lỗi đồng bộ Drone:", e);
        } finally {
            setLoading(false);
        }
    };

    // Auto refresh mỗi 5s
    useEffect(() => {
        if(isSuperAdmin) {
            load();
            const interval = setInterval(load, 5000); 
            return () => clearInterval(interval);
        }
    }, [isSuperAdmin]);

    // Filter Logic
    const displayedDrones = useMemo(() => {
        if (filter === 'ALL') return fleetData;
        return fleetData.filter(d => d.status === filter);
    }, [fleetData, filter]);

    const stats = useMemo(() => ({
        total: fleetData.length,
        idle: fleetData.filter(d => d.status === 'IDLE').length,
        busy: fleetData.filter(d => d.status === 'BUSY').length,
        maintenance: fleetData.filter(d => d.status === 'MAINTENANCE').length,
    }), [fleetData]);

    if (!isSuperAdmin) return <div style={{padding:20}}>Bạn không có quyền truy cập.</div>;

    return (
        <section className="drone-manager-wrap">
            <style>{styles}</style>
            
            <div className="header-row">
                <div>
                    <h1 className="page-title">Trung Tâm Điều Hành Drone</h1>
                    <p className="sub-title">Tự động điều phối và giám sát thời gian thực</p>
                </div>
                <button className="btn-refresh" onClick={load} disabled={loading}>
                    {loading ? 'Đang đồng bộ...' : '↻ Làm mới'}
                </button>
            </div>

            {/* KPI Cards */}
            <div className="stats-grid">
                <StatCard title="TỔNG PHI ĐỘI" count={stats.total} icon={<DroneIcon />} color="#34495e" isActive={filter==='ALL'} onClick={()=>setFilter('ALL')} />
                <StatCard title="SẴN SÀNG" count={stats.idle} icon="✅" color="#27ae60" isActive={filter==='IDLE'} onClick={()=>setFilter('IDLE')} />
                <StatCard title="ĐANG BAY" count={stats.busy} icon="🚀" color="#2980b9" isActive={filter==='BUSY'} onClick={()=>setFilter('BUSY')} />
                <StatCard title="CẦN BẢO TRÌ" count={stats.maintenance} icon="🔧" color="#e74c3c" isActive={filter==='MAINTENANCE'} onClick={()=>setFilter('MAINTENANCE')} />
            </div>

            {/* Drone List Table */}
            <div className="table-container fade-in">
                <table className="drone-table">
                    <thead>
                        <tr>
                            <th>Drone ID</th>
                            <th>Model</th>
                            <th>Số chuyến bay</th>
                            <th>Trạng thái</th>
                            <th>Cửa hàng (Merchant)</th>
                            <th>Đang làm nhiệm vụ</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedDrones.map(d => (
                            <tr key={d.id} onClick={() => setSelectedDrone(d)} className="clickable-row">
                                <td style={{fontWeight:'bold', color:'#34495e'}}>{d.id}</td>
                                <td>{d.model}</td>
                                <td>
                                    <span style={{fontWeight:'bold'}}>
                                        {d.totalFlights} 
                                    </span>
                                    {d.maintenanceAlert && <span style={{fontSize:10, color:'red', marginLeft:5}}>(Cần bảo trì)</span>}
                                </td>
                                <td><span className={`status-badge ${d.status}`}>{d.status}</span></td>
                                
                                <td>
                                    {d.currentMission ? (
                                        <div className="merchant-info" style={{fontWeight: 600, color: '#333'}}>
                                            {d.currentMission.merchantName}
                                        </div>
                                    ) : <span style={{color:'#ccc'}}>—</span>}
                                </td>

                                <td>
                                    {d.currentMission ? (
                                        <div className="mission-info">
                                            <span className="order-tag">Đơn #{d.currentMission.orderId}</span>
                                            {d.currentMission.isSimulation && <span style={{fontSize:9, color:'#e67e22', marginLeft: 4}}>(Auto)</span>}
                                        </div>
                                    ) : <span style={{color:'#ccc'}}>—</span>}
                                </td>
                                <td>
                                    <button className="btn-view">Xem chi tiết</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {selectedDrone && (
                <DroneHistoryModal 
                    drone={selectedDrone} 
                    onClose={() => setSelectedDrone(null)} 
                />
            )}
        </section>
    );
}

// --- CSS STYLES ---
const styles = `
    .drone-manager-wrap { max-width: 1200px; margin: 20px auto; padding: 0 20px; font-family: 'Segoe UI', sans-serif; }
    .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
    .page-title { margin: 0; font-size: 24px; color: #2c3e50; font-weight: 800; }
    .sub-title { margin: 5px 0 0; color: #7f8c8d; font-size: 14px; }
    .btn-refresh { padding: 8px 16px; background: #fff; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-weight: 600; color: #555; }
    .btn-refresh:hover { background: #f8f9fa; border-color: #bbb; }

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
    @media (max-width: 768px) { .stats-grid { grid-template-columns: 1fr 1fr; } }
    .stat-card { background: #fff; border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); cursor: pointer; transition: 0.2s; border: 1px solid #eee; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
    .stat-card.active { background: #f0f7ff; border-color: #3498db !important; ring: 2px solid #3498db; }
    .stat-icon { width: 45px; height: 45px; border-radius: 10px; display: grid; place-items: center; font-size: 20px; }
    .stat-count { font-size: 24px; font-weight: 800; line-height: 1; }
    .stat-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #95a5a6; }

    .table-container { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border: 1px solid #eee; overflow-x: auto; }
    .drone-table { width: 100%; border-collapse: collapse; min-width: 900px; }
    .drone-table th { text-align: left; padding: 12px; color: #7f8c8d; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #eee; }
    .drone-table td { padding: 12px; border-bottom: 1px solid #f9f9f9; color: #2c3e50; font-size: 14px; vertical-align: middle; }
    .clickable-row { cursor: pointer; transition: background 0.2s; }
    .clickable-row:hover { background: #f8fbff; }

    /* Status Badges */
    .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; display: inline-block; }
    .status-badge.IDLE { background: #eefbee; color: #27ae60; }
    .status-badge.BUSY { background: #eaf2f8; color: #2980b9; animation: pulse 2s infinite; }
    .status-badge.MAINTENANCE { background: #fdedec; color: #e74c3c; }

    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }

    .mission-info { display: flex; flex-direction: column; gap: 2px; }
    .order-tag { font-weight: 700; color: #2980b9; font-size: 13px; }
    
    .btn-view { border: 1px solid #ddd; background: #fff; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; color: #555; }
    .btn-view:hover { border-color: #3498db; color: #3498db; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
    .modal-content { background: #fff; width: 600px; max-width: 90vw; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); overflow: hidden; animation: slideIn 0.3s; }
    @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .modal-header { padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; }
    .btn-close { border: none; background: none; font-size: 24px; cursor: pointer; color: #999; }
    .modal-body { padding: 20px; }
    
    .drone-info-row { display: flex; justify-content: space-between; background: #fafafa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-item label { font-size: 11px; text-transform: uppercase; color: #888; font-weight: 700; }
    .info-item span { font-weight: 600; color: #333; font-size: 14px; }
    
    .table-scroll { max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; }
    .history-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .history-table th { position: sticky; top: 0; background: #fff; z-index: 1; text-align: left; padding: 10px; border-bottom: 1px solid #eee; color: #888; }
    .history-table td { padding: 10px; border-bottom: 1px solid #f5f5f5; color: #333; }
    .status-pill.delivered { color: #27ae60; font-weight: 600; }
    .status-pill.in_progress { color: #2980b9; font-weight: 600; }
`;