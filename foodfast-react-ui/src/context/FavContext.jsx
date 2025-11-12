import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const FavCtx = createContext(null)
const LS_KEY = 'ff_fav_v1'

export function FavProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(ids)) } catch {}
  }, [ids])

  const toggle = (id) => setIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const has = (id) => ids.includes(id)
  const count = useMemo(() => ids.length, [ids])

  return <FavCtx.Provider value={{ ids, count, toggle, has }}>{children}</FavCtx.Provider>
}

export function useFav() {
  const ctx = useContext(FavCtx)
  if (!ctx) throw new Error('useFav must be used within FavProvider')
  return ctx
}
