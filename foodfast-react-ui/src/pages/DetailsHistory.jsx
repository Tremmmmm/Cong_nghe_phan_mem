// src/pages/DetailsHistory.jsx
import { useEffect, useMemo, useState } from 'react'
import { myOrders, getMenu } from '../utils/api'
import { useAuth } from '../context/AuthContext.jsx'
import MENU_ALL from '../data/menuData.js'

function VND(n){ return (n||0).toLocaleString('vi-VN') + '₫' }
const FALLBACK = '/assets/images/Delivery.png'

export default function DetailsHistory(){
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Ưu tiên lấy từ MENU_ALL (local), nếu vẫn muốn dùng API getMenu thì giữ Promise.all
  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const [{ rows }, mn] = await Promise.all([
        // lấy đúng rows từ myOrders (server-side pagination)
        myOrders({ page: 1, limit: 100, status: 'all', sort: 'createdAt', order: 'desc' }),
        // menu: nếu lỗi API thì rơi về MENU_ALL
        getMenu().catch(()=> MENU_ALL)
      ])
      setOrders(Array.isArray(rows) ? rows : [])
      setMenu((Array.isArray(mn) ? mn : MENU_ALL) || [])
    } catch (e) {
      console.error(e)
      setOrders([])
      setMenu(MENU_ALL || [])
      setError('Không tải được dữ liệu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() }, [])
  useEffect(()=>{
    const t = setInterval(load, 10000) // auto 10s
    return () => clearInterval(t)
  },[])

  const menuMap = useMemo(() => {
    const m = {}
    ;(menu || []).forEach(it => { m[it.id] = it })
    ;(MENU_ALL || []).forEach(it => { m[it.id] = it }) // overlay local data
    return m
  }, [menu])

  const my = useMemo(() => {
    if (!user?.email) return orders
    return orders.filter(o => o.userEmail === user.email)
  }, [orders, user?.email])

  const css = `
    .dh-wrap{max-width:1100px;margin:24px auto;padding:0 16px}
    .title{font-size:28px;font-weight:900;text-align:center;margin:0 0 12px}
    .user-info{margin:0 auto 24px;border:1px solid #e7e7e7;border-radius:12px;overflow:hidden;width:90%}
    .user-info table{width:100%;border-collapse:collapse}
    .user-info th,.user-info td{border:1px solid #eee;padding:12px;text-align:left;background:#fff}
    .user-info th{background:#f9f9f9;width:20%}
    .hist-title{font-size:24px;font-weight:800;text-align:center;margin:8px 0 14px}
    .table{width:95%;margin:0 auto 40px;border-collapse:collapse;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.06)}
    .table th{background:#f7f7f7;font-weight:700;padding:12px;border:1px solid #eee;text-align:center}
    .table td{padding:12px;border:1px solid #eee;text-align:center}
    .img{width:64px;height:64px;border-radius:10px;object-fit:cover;display:block;margin:0 auto;background:#f6f6f6}
    .top{display:flex;justify-content:center;gap:12px;margin-bottom:12px}
    .ff-btn{height:32px;border:none;border-radius:16px;background:#ff7a59;color:#fff;padding:0 12px;cursor:pointer}
    .err{color:#c24a26;text-align:center;margin:6px 0}
  `

  const getItemImage = (it) => it.image || menuMap[it.id]?.image || FALLBACK

  return (
    <section className="dh-wrap">
      <style>{css}</style>

      <div className="top">
        <button className="ff-btn" onClick={load}>Refresh</button>
      </div>

      <h2 className="title">My Details</h2>
      {error && <div className="err">{error}</div>}

      <div className="user-info">
        <table>
          <tbody>
            <tr>
              <th>Name</th><td>{user?.name || user?.email?.split('@')[0] || '—'}</td>
              <th>Email</th><td>{user?.email || '—'}</td>
            </tr>
            <tr>
              <th>Contact No.</th><td>{my[0]?.phone || '—'}</td>
              <th>Address</th><td>{my[0]?.address || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="hist-title">{(user?.email || 'User') + "’s Orders History"}</h3>

      {loading ? 'Đang tải…' : my.length === 0 ? (
        <div style={{textAlign:'center'}}>Chưa có đơn hàng nào.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Product</th>
              <th>Product Name</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Total Price</th>
              <th>Order Id</th>
              <th>Date/Time</th>
            </tr>
          </thead>
          <tbody>
            {my.flatMap((o, oi) =>
              o.items?.map((it, idx) => (
                <tr key={`${o.id}-${idx}`}>
                  <td>{oi + 1}.{idx + 1}</td>
                  <td><img className="img" src={getItemImage(it)} alt={it.name} onError={(e)=>{e.currentTarget.src=FALLBACK}} /></td>
                  <td>{it.name}</td>
                  <td>{VND(it.price)}</td>
                  <td>{it.qty}</td>
                  <td>{VND((it.price||0)*(it.qty||0))}</td>
                  <td>{o.id}</td>
                  <td>{o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </section>
  )
}
