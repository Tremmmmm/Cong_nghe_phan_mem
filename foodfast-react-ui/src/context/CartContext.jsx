// src/context/CartContext.jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'

const CartCtx = createContext(null)
export const useCart = () => {
  const ctx = useContext(CartCtx)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

// ================= Key helpers =================
const V2_PREFIX = 'ff_cart_v2:'
const V1_LEGACY = 'ff_cart_v1' // key cũ của bạn -> migrate 1 lần

function ensureAnonId() {
  let id = localStorage.getItem('ff_anon_id')
  if (!id) {
    id = Math.random().toString(36).slice(2, 10)
    localStorage.setItem('ff_anon_id', id)
  }
  return id
}
function slug(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
  function storageKeyFor(user) {
  // Ưu tiên email (ổn định, duy nhất)
  if (user?.email) {
    return `ff_cart_v2:ue:${String(user.email).toLowerCase()}`
  }
  // Sau đó đến username hoặc name
  if (user?.username) {
    return `ff_cart_v2:un:${String(user.username).toLowerCase()}`
  }
  if (user?.name || user?.displayName) {
    const n = String(user.name || user.displayName).toLowerCase()
    return `ff_cart_v2:un:${n}`
  }
  // Cuối cùng mới dùng id (vì dự án của bạn set id=1 cho mọi user thường)
  if (user?.id != null) {
    return `ff_cart_v2:uid:${user.id}`
  }
  // Guest
  let anon = localStorage.getItem('ff_anon_id')
  if (!anon) {
    anon = Math.random().toString(36).slice(2, 10)
    localStorage.setItem('ff_anon_id', anon)
  }
  return `ff_cart_v2:g:${anon}`
}

export function CartProvider({ children }) {
  const { user } = useAuth()

  // Key phụ thuộc user hiện tại
  const storageKey = useMemo(() => storageKeyFor(user), [user])

  const [items, setItems] = useState([])
  const firstLoadRef = useRef(true)

  // Load khi key đổi (login/logout/switch account)
  useEffect(() => {
    try {
      // migrate từ key v1 -> key mới (một lần duy nhất)
      const legacyRaw = localStorage.getItem(V1_LEGACY)
      const currentRaw = localStorage.getItem(storageKey)
      if (legacyRaw && !currentRaw) {
        localStorage.setItem(storageKey, legacyRaw)
      }
      if (legacyRaw) localStorage.removeItem(V1_LEGACY)

      const raw = localStorage.getItem(storageKey)
      const parsed = raw ? JSON.parse(raw) : []
      setItems(Array.isArray(parsed) ? parsed : [])
    } catch {
      setItems([])
    }
    firstLoadRef.current = false
  }, [storageKey])

  // Persist khi items đổi cho đúng key hiện tại
  useEffect(() => {
    if (firstLoadRef.current) return
    try { localStorage.setItem(storageKey, JSON.stringify(items || [])) } catch {}
  }, [items, storageKey])

  // (tuỳ chọn) Sync giữa nhiều tab nếu cùng tài khoản
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === storageKey) {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : []
          setItems(Array.isArray(parsed) ? parsed : [])
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [storageKey])

  // ============== API giữ nguyên ==============
  const add = (item) => {
    if (!item) return
    setItems(prev => {
      const i = prev.findIndex(p => p.id === item.id)
      if (i >= 0) {
        const clone = [...prev]
        clone[i] = { ...clone[i], qty: (clone[i].qty || 0) + 1 }
        return clone
      }
      return [...prev, { ...item, qty: 1 }]
    })
  }

  const dec = (id) => {
    setItems(prev => prev.flatMap(p => {
      if (p.id !== id) return [p]
      const q = (p.qty || 0) - 1
      return q > 0 ? [{ ...p, qty: q }] : []
    }))
  }

  const remove = (id) => setItems(prev => prev.filter(p => p.id !== id))
  const clear  = () => setItems([])

  const total  = useMemo(
    () => items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0),
    [items]
  )

  const value = { items, add, dec, remove, clear, total }
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}
