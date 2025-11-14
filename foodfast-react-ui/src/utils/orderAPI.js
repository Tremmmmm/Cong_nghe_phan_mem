import axios from 'axios'

// API json-server (menu, orders, sessions, payments)
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5181', // đồng bộ 5181
  withCredentials: false,
  timeout: 10000,
  headers: {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
})

// ====== MENU (Có thể giữ hoặc chuyển sang menuAPI.js tùy bạn) ======
export const getMenu = (params = {}) =>
  api.get('/menu', { params }).then((r) => r.data)

// ====== SESSIONS (PoC) ======
export const createSession = async () => {
  const payload = { status: 'open', startedAt: new Date().toISOString() }
  const { data } = await api.post('/sessions', payload)
  return data
}

export const closeSession = async (sessionId) => {
  const payload = { status: 'closed', endedAt: new Date().toISOString() }
  // 💡 SỬA LẠI DÙNG BACKTICK (`)
  const { data } = await api.patch(`/sessions/${sessionId}`, payload) 
  return data
}

// ====== ORDERS ======
// Ép status 'new' để nhà hàng thao tác ngay; giữ 'unpaid' cho COD
export const createOrder = async (payload) => {
  const sanitized = {
    ...payload,
    status: 'new',
    payment_status: payload?.payment_status ?? 'unpaid',
    createdAt: payload?.createdAt ?? Date.now(),
    deliveryMode: payload?.deliveryMode || 'DRONE',
  }
  const { data } = await api.post('/orders', sanitized)
  return data
}

export const placeOrder = createOrder

/**
 * Lấy danh sách đơn hàng (Hỗ trợ lọc theo merchantId, userId, userEmail)
 */
export const myOrders = async ({
  page = 1,
  limit = 10,
  status = 'all',
  q = '',
  sort = 'createdAt',
  order = 'desc',
  merchantId = null, 
  userId = null, 
  userEmail = null, // ✅ BẠN THÊM CÁI NÀY LÀ ĐÚNG
} = {}) => {
  const params = {
    _page: page,
    _limit: limit,
    _sort: sort,
    _order: order,
    _: Date.now(),
  }

  if (status && status !== 'all') {
    params.status = status === 'new' ? 'new' : status
  }

  if (q) params.q = q
  if (merchantId) params.merchantId = merchantId
  if (userId) {
    params.userId = userId
  } else if (userEmail) {
    params.userEmail = userEmail
  }

  const res = await api.get('/orders', { params })
  const total = Number(res.headers['x-total-count'] || 0)
  const rows = res.data || []
  const pageCount = Math.max(1, Math.ceil(total / limit))
  return { rows, total, pageCount }
}

export const updateOrderStatus = (id, patch) => {
  const data = typeof patch === 'string' ? { status: patch } : patch
  // 💡 SỬA LẠI DÙNG BACKTICK (`)
  return api.patch(`/orders/${id}`, data).then((r) => r.data)
}

export const getOrder = (id) =>
  // 💡 SỬA LẠI DÙNG BACKTICK (`)
  api.get(`/orders/${id}?_=${Date.now()}`).then((r) => r.data)

export const getAllOrders = async (merchantId = null) => {
  const params = {
    _sort: 'createdAt',
    _order: 'desc',
    _limit: 10000,
    _: Date.now(),
  }
  if (merchantId) {
    params.merchantId = merchantId
  }
  const res = await api.get('/orders', { params })
  return res.data || []
}

// ====== PAYMENT (PoC mock) ======
export const createPayment = async ({ orderId, amount, method = 'CARD' }) => {
  const payload = {
    orderId,
    amount,
    method,
    provider: 'mock',
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  const { data } = await api.post('/payments', payload)
  return data
}

export const capturePayment = async (paymentId) => {
  // 💡 SỬA LẠI DÙNG BACKTICK (`)
  const { data } = await api.patch(`/payments/${paymentId}`, {
    status: 'captured',
    updatedAt: new Date().toISOString(),
  })
  return data
}

export const patchOrder = (id, payload) =>
  // 💡 SỬA LẠI DÙNG BACKTICK (`)
  api.patch(`/orders/${id}`, payload).then((r) => r.data)

// ===== DRONE MISSIONS / POSITIONS =====
export const getOrderById = (id) =>
  // 💡 SỬA LẠI DÙNG BACKTICK (`)
  api.get(`/orders/${id}`).then((r) => r.data)

export const getMissionById = (id) =>
  // 💡 SỬA LẠI DÙNG BACKTICK (`)
  api.get(`/droneMissions/${id}`).then((r) => r.data)

export const createDemoMission = async ({ origin, destination }) => {
  const payload = {
    status: 'simulating',
    origin,
    destination,
    createdAt: new Date().toISOString(),
  }
  const { data } = await api.post('/droneMissions', payload)
  return data
}

export const getDronePositions = async ({ missionId, since = 0 }) => {
  const q = new URLSearchParams({
    missionId: String(missionId),
    _sort: 'timestamp',
    _order: 'asc',
  })
  if (since && Number(since) > 0) q.set('timestamp_gte', String(since))
  // 💡 SỬA LẠI DÙNG BACKTICK (`)
  const { data } = await api.get(`/dronePositions?${q.toString()}`)
  return data
}

export const postDronePosition = async (pos) => {
  const { data } = await api.post('/dronePositions', pos)
  return data
}