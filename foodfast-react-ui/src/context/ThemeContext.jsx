import { createContext, useContext, useEffect, useState } from 'react'

const ThemeCtx = createContext(null)
const LS_KEY = 'ff_theme'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(LS_KEY) || 'light' } catch { return 'light' }
  })

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, theme) } catch {}
    const el = document.body
    if (theme === 'dark') el.classList.add('dark')
    else el.classList.remove('dark')
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  return <ThemeCtx.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
