import axios from 'axios'

// API json-server (menu, orders, sessions, payments)
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5176',
  withCredentials: false,
  timeout: 10000,
  headers: {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  }
})

// ====== MENU ======
export const getMenu = (params = {}) =>
  api.get('/menu', { params }).then(r => r.data)

// ====== SESSIONS (PoC) ======
export const createSession = async () => {
  const payload = { status: 'open', startedAt: new Date().toISOString() }
  const { data } = await api.post('/sessions', payload)
  return data
}

export const closeSession = async (sessionId) => {
  const payload = { status: 'closed', endedAt: new Date().toISOString() }
  const { data } = await api.patch(`/sessions/${sessionId}`, payload)
  return data
}

// ====== ORDERS ======
export const createOrder = (payload) =>
  api.post('/orders', payload).then(r => r.data)

export const placeOrder = createOrder

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
    _: Date.now(), // cache-buster
  }
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

/**
 * Update order status (flexible):
 * - updateOrderStatus(id, 'delivered')
 * - updateOrderStatus(id, { status:'delivered', doneAt: '...' })
 */
export const updateOrderStatus = (id, patch) => {
  const data = (typeof patch === 'string') ? { status: patch } : patch
  return api.patch(`/orders/${id}`, data).then(r => r.data)
}

export const getOrder = (id) =>
  api.get(`/orders/${id}?_=${Date.now()}`).then(r => r.data)

export const getAllOrders = async () => {
  const res = await api.get('/orders', {
    params: {
      _sort: 'createdAt',
      _order: 'desc',
      _limit: 10000,
      _: Date.now(),
    },
  })
  return res.data || []
}

// ====== PAYMENT (PoC mock) ======
export const createPayment = async ({ orderId, amount, method = 'CARD' }) => {
  const payload = {
    orderId, amount, method, provider: 'mock',
    status: 'pending', createdAt: new Date().toISOString()
  }
  const { data } = await api.post('/payments', payload)
  return data
}

export const capturePayment = async (paymentId) => {
  const { data } = await api.patch(`/payments/${paymentId}`, {
    status: 'captured', updatedAt: new Date().toISOString()
  })
  return data
}
