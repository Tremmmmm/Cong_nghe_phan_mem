// src/utils/api.js
import axios from 'axios'

// API json-server (menu, orders)
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5176',
  withCredentials: false,
  timeout: 10000,
  headers: {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  }
})

// ====== MENU & ORDERS ======
export const getMenu = (params = {}) =>
  api.get('/menu', { params }).then(r => r.data)

// Tạo đơn: gửi thẳng lên server
export const createOrder = (payload) =>
  api.post('/orders', payload).then(r => r.data)

// Alias để Checkout gọi
export const placeOrder = createOrder

/**
 * Đọc orders với phân trang/lọc/tìm kiếm theo chuẩn json-server
 * @param {Object} opts
 * @param {number} opts.page  - trang hiện tại (>=1)
 * @param {number} opts.limit - số dòng/trang
 * @param {string} opts.status - 'all' | 'pending' | 'confirmed' | ...
 * @param {string} opts.q - từ khoá tìm (id/phone/name)
 * @param {string} opts.sort - field sort (mặc định 'createdAt')
 * @param {'asc'|'desc'} opts.order - thứ tự sort
 * @returns {Promise<{rows: any[], total: number, pageCount: number}>}
 */
export const myOrders = async ({
  page = 1,
  limit = 10,
  status = 'all',
  q = '',
  sort = 'createdAt',
  order = 'desc',
} = {}) => {
  const params = {
    _page: page,
    _limit: limit,
    _sort: sort,
    _order: order,
    _ : Date.now(), // cache-buster
  }

  // Map 'pending' UI -> 'new' trong db.json
  if (status && status !== 'all') {
    params.status = (status === 'pending') ? 'new' : status
  }
  if (q) params.q = q

  const res = await api.get('/orders', { params })
  const total = Number(res.headers['x-total-count'] || 0)
  const rows = res.data || []
  const pageCount = Math.max(1, Math.ceil(total / limit))
  return { rows, total, pageCount }
}

// Cập nhật trạng thái
export const updateOrderStatus = (id, status) =>
  api.patch(`/orders/${id}`, { status }).then(r => r.data)
