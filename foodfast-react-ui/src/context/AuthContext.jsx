import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

const LS_KEY = 'ff_user'
const AuthCtx = createContext(null)

// hardcode admin demo
const ADMIN_EMAIL = 'admin@foodfast.com'
const ADMIN_PASS  = '123456'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || null }
    catch { return null }
  })

  useEffect(() => {
    if (user) localStorage.setItem(LS_KEY, JSON.stringify(user))
    else localStorage.removeItem(LS_KEY)
  }, [user])

  // Sign in cho cả user thường & admin (demo)
  const signIn = async ({ email, password }) => {
    // demo rule: nếu là admin@foodfast.com / 123456 => admin
    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
      const u = { id: 0, name: 'Admin', email, isAdmin: true }
      setUser(u)
      return { user: u }
    }
    // user thường (mock)
    const u = { id: 1, email, name: email.split('@')[0], isAdmin: false }
    setUser(u)
    return { user: u }
  }

  const signUp = async ({ name, email, phone, password }) => {
    const u = { id: 1, name, email, phone, isAdmin: false }
    setUser(u)
    return { ok: true }
  }

  const signOut = () => setUser(null)

  return (
    <AuthCtx.Provider value={{ user, signIn, signUp, signOut }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// Guard: chỉ cần login
export function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }
  return children
}

// Guard: bắt buộc là admin
export function RequireAdmin({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }
  if (!user.isAdmin) {
    return <Navigate to="/" replace />
  }
  return children
}