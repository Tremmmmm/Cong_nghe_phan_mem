import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartCtx = createContext(null)
const LS_KEY = 'ff_cart_v1'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items))
  }, [items])

  const add = (item) => {
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
  const total  = useMemo(() => items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0), [items])

  const value = { items, add, dec, remove, clear, total }
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export function useCart() {
  const ctx = useContext(CartCtx)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
