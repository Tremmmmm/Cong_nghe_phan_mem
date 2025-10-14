import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

const LS_KEY = 'ff_user'
const LS_PROFILE = 'ff_profile_v1'       // { [email]: { name, address, phone } }
const LS_ACC_IDX = 'ff_account_idx_v1'   // { [usernameLower]: email }

const AuthCtx = createContext(null)

// hardcode admin demo
const ADMIN_EMAIL = 'admin@foodfast.com'
const ADMIN_PASS  = '123456'

// helper
const isEmail = (s) => /\S+@\S+\.\S+/.test(String(s||''))

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || null }
    catch { return null }
  })

  // ===== Helpers đọc/ghi "DB" cục bộ
  const getProfiles = () => {
    try { return JSON.parse(localStorage.getItem(LS_PROFILE) || '{}') } catch { return {} }
  }
  const setProfiles = (obj) => {
    try { localStorage.setItem(LS_PROFILE, JSON.stringify(obj)) } catch {}
  }
  const getIndex = () => {
    try { return JSON.parse(localStorage.getItem(LS_ACC_IDX) || '{}') } catch { return {} }
  }
  const setIndex = (obj) => {
    try { localStorage.setItem(LS_ACC_IDX, JSON.stringify(obj)) } catch {}
  }

  // ✅ cập nhật user + đồng bộ xuống profile & index khi cần
  const updateUser = (patch) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, ...patch }

      const profiles = getProfiles()
      if (next.email) {
        profiles[next.email] = {
          ...(profiles[next.email] || {}),
          name: next.name ?? (profiles[next.email]?.name || ''),
          phone: next.phone ?? (profiles[next.email]?.phone || ''),
          address: next.address ?? (profiles[next.email]?.address || '')
        }
        setProfiles(profiles)

        // cập nhật index username → email theo tên mới
        if (next.name) {
          const idx = getIndex()
          // xoá key cũ đang trỏ tới email này
          for (const k of Object.keys(idx)) if (idx[k] === next.email) delete idx[k]
          idx[next.name.toLowerCase()] = next.email
          setIndex(idx)
        }
      }
      return next
    })
  }

  useEffect(() => {
    try {
      if (user) localStorage.setItem(LS_KEY, JSON.stringify(user))
      else localStorage.removeItem(LS_KEY)
    } catch {}
  }, [user])

  // ===== Sign in: chấp nhận username HOẶC email
  // Param 'email' của form hiện tại chính là "identifier"
  const signIn = async ({ email, password }) => {
    const identifier = String(email || '').trim()

    // admin demo
    if (identifier === ADMIN_EMAIL && password === ADMIN_PASS) {
      const u = { id: 0, name: 'Admin', email: ADMIN_EMAIL, isAdmin: true }
      setUser(u)
      return { user: u }
    }

    // resolve email khi login bằng username
    let resolvedEmail = ''
    if (isEmail(identifier)) {
      resolvedEmail = identifier
    } else {
      const idx = getIndex()
      resolvedEmail = idx[identifier.toLowerCase()] || ''
    }

    const profiles = getProfiles()
    const pf = resolvedEmail ? (profiles[resolvedEmail] || {}) : {}

    // Tên hiển thị: ưu tiên từ hồ sơ
    const displayName =
      pf.name ||
      user?.name ||
      (!isEmail(identifier) ? identifier : (resolvedEmail ? resolvedEmail.split('@')[0] : identifier))

    const u = {
      id: 1,
      email: resolvedEmail || user?.email || (isEmail(identifier) ? identifier : ''),
      name: displayName,
      phone: pf.phone || user?.phone || '',
      address: pf.address || user?.address || '',
      isAdmin: false
    }
    setUser(u)
    return { user: u }
  }

  // ===== Sign up: lưu hồ sơ + index username→email, đăng nhập luôn
  const signUp = async ({ name, email, phone, address, password }) => {
    // lưu hồ sơ
    const profiles = getProfiles()
    profiles[email] = {
      name: name || (email ? email.split('@')[0] : ''),
      phone: phone || '',
      address: address || ''
    }
    setProfiles(profiles)

    // index username → email (lower-case)
    const idx = getIndex()
    if (name) idx[String(name).toLowerCase()] = email
    setIndex(idx)

    const u = { id: 1, name, email, phone: phone || '', address: address || '', isAdmin: false }
    setUser(u)
    return { ok: true, user: u }
  }

  const signOut = () => setUser(null)

  return (
    <AuthCtx.Provider value={{ user, signIn, signUp, signOut, updateUser }}>
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
