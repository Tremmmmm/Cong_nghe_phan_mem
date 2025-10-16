// src/context/CartContext.jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'

const CartCtx = createContext(null)
export const useCart = () => {
  const ctx = useContext(CartCtx)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

const PREFIX = 'ff_cart_v2:'
const LEGACY = 'ff_cart_v1' // key cũ

function ensureAnonId() {
  let id = localStorage.getItem('ff_anon_id')
  if (!id) {
    id = Math.random().toString(36).slice(2, 10)
    localStorage.setItem('ff_anon_id', id)
  }
  return id
}
const lc = s => String(s || '').toLowerCase()
const slug = s =>
  lc(s)
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** Khóa chính ổn định cho user hiện tại */
function primaryKeyFor(user) {
  if (user?.email)      return `${PREFIX}ue:${lc(user.email)}`
  if (user?.username)   return `${PREFIX}un:${lc(user.username)}`
  if (user?.name)       return `${PREFIX}un:${slug(user.name)}`
  if (user?.displayName)return `${PREFIX}un:${slug(user.displayName)}`
  if (user?.id != null) return `${PREFIX}uid:${user.id}`
  return `${PREFIX}g:${ensureAnonId()}`
}

/** Các khóa alias có thể từng dùng (để load lại nếu trước đó lưu kiểu khác) */
function candidateKeysFor(user) {
  const keys = new Set()
  keys.add(primaryKeyFor(user))
  if (user?.email)       keys.add(`${PREFIX}ue:${lc(user.email)}`)
  if (user?.username)    keys.add(`${PREFIX}un:${lc(user.username)}`)
  if (user?.name)        keys.add(`${PREFIX}un:${slug(user.name)}`)
  if (user?.displayName) keys.add(`${PREFIX}un:${slug(user.displayName)}`)
  if (user?.id != null)  keys.add(`${PREFIX}uid:${user.id}`)
  const anon = localStorage.getItem('ff_anon_id')
  if (anon) keys.add(`${PREFIX}g:${anon}`)
  keys.add(LEGACY)
  return Array.from(keys)
}

export function CartProvider({ children }) {
  const { user } = useAuth()
  const storageKey = useMemo(() => primaryKeyFor(user), [user])

  const [items, setItems] = useState([])
  const loadedKeyRef = useRef(null)

  // ===== Load: quét alias → lấy data đầu tiên tìm thấy → sync về khóa chính
  useEffect(() => {
    let found = null
    const candidates = candidateKeysFor(user)
    for (const k of candidates) {
      try {
        const raw = localStorage.getItem(k)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          found = { key: k, data: parsed }
          break
        }
      } catch {}
    }

    if (found) {
      setItems(found.data)
      loadedKeyRef.current = storageKey
      if (found.key !== storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(found.data)) } catch {}
      }
      if (found.key === LEGACY) {
        try { localStorage.removeItem(LEGACY) } catch {}
      }
    } else {
      setItems([])
      loadedKeyRef.current = storageKey
      try { localStorage.setItem(storageKey, JSON.stringify([])) } catch {}
    }
  }, [user, storageKey])

  // ===== Helper: write-through ngay khi thay đổi
  const writeThrough = (nextItems, key = storageKey) => {
    try { localStorage.setItem(key, JSON.stringify(nextItems || [])) } catch {}
  }

  // Sync đa tab cho cùng user
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === storageKey) {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : []
          setItems(Array.isArray(parsed) ? parsed : [])
          loadedKeyRef.current = storageKey
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [storageKey])

  // ===== API (write-through)
  const add = (item) => {
    if (!item) return
    setItems(prev => {
      const idx = prev.findIndex(p => p.id === item.id)
      let next
      if (idx >= 0) {
        next = [...prev]
        next[idx] = { ...next[idx], qty: (next[idx].qty || 0) + 1 }
      } else {
        next = [...prev, { ...item, qty: 1 }]
      }
      writeThrough(next)
      return next
    })
  }

  const dec = (id) => {
    setItems(prev => {
      const next = prev.flatMap(p => {
        if (p.id !== id) return [p]
        const q = (p.qty || 0) - 1
        return q > 0 ? [{ ...p, qty: q }] : []
      })
      writeThrough(next)
      return next
    })
  }

  const remove = (id) => {
    setItems(prev => {
      const next = prev.filter(p => p.id !== id)
      writeThrough(next)
      return next
    })
  }

  const clear  = () => {
    setItems([])
    writeThrough([])
  }

  const total  = useMemo(
    () => items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0),
    [items]
  )

  const value = { items, add, dec, remove, clear, total }
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}
