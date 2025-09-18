import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

const LS_KEY = 'ff_user'
const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || null }
    catch { return null }
  })

  useEffect(() => {
    if (user) localStorage.setItem(LS_KEY, JSON.stringify(user))
    else localStorage.removeItem(LS_KEY)
  }, [user])

  const signIn = async ({ email, password }) => {
    // demo: không gọi API thật, chỉ mock
    const u = { id: 1, email }
    setUser(u)
    return { user: u }
  }

  const signUp = async ({ name, email, phone, password }) => {
    // demo: đăng ký luôn thành công
    const u = { id: 1, name, email, phone }
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

// Guard component để bảo vệ route
export function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }
  return children
}
