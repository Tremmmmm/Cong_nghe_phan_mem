import axios from 'axios'

// API json-server (menu, orders)
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5176',
  withCredentials: false
})

// ====== MENU & ORDERS ======
export const getMenu           = () => api.get('/menu').then(r => r.data)
export const createOrder       = (payload) => api.post('/orders', payload).then(r => r.data)
export const myOrders          = () => api.get('/orders?_sort=createdAt&_order=desc').then(r => r.data)
export const updateOrderStatus = (id, status) => api.patch(`/orders/${id}`, { status }).then(r => r.data)
