import { createContext, useContext, useState } from 'react'
import { setAuthToken } from '../services/authToken'

const AuthContext = createContext(null)

// Which role's session should THIS tab load? Determined from the URL, not from a single
// global "last logged in" value — so an Admin tab stays on /admin/... and a Customer tab
// stays on /customer/... even if someone logs in as a different role in another tab of the
// same browser. Each role gets its own localStorage bucket (rmr_session_ADMIN, etc).
function roleFromPath(pathname) {
  if (pathname.startsWith('/admin'))    return 'ADMIN'
  if (pathname.startsWith('/customer')) return 'CUSTOMER'
  if (pathname.startsWith('/driver'))   return 'DRIVER'
  return null
}

function readSession(role) {
  if (!role) return { token: null, user: null }
  try {
    const raw = localStorage.getItem('rmr_session_' + role)
    return raw ? JSON.parse(raw) : { token: null, user: null }
  } catch {
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }) {
  const initialRole = roleFromPath(window.location.pathname)
  const initial = readSession(initialRole)
  // Prime the axios bridge synchronously so the very first API call from this tab
  // (even before any component re-renders) already carries the right token.
  setAuthToken(initial.token)

  const [user,  setUser]  = useState(initial.user)
  const [token, setToken] = useState(initial.token)

  // authData matches backend AuthResponseDTO:
  // { token, role, userId, name, email, message, success }
  function login(authData) {
    const userData = {
      userId: authData.userId,
      name:   authData.name,
      email:  authData.email,
      role:   authData.role,
    }
    localStorage.setItem('rmr_session_' + authData.role, JSON.stringify({ token: authData.token, user: userData }))
    setAuthToken(authData.token)
    setToken(authData.token)
    setUser(userData)
  }

  function logout() {
    if (user?.role) localStorage.removeItem('rmr_session_' + user.role)
    setAuthToken(null)
    setToken(null)
    setUser(null)
  }

  // Merges a partial update (e.g. { name, email } after a profile edit) into the
  // logged-in user without requiring them to log in again to see the change.
  function updateUser(partial) {
    setUser(prev => {
      const next = { ...prev, ...partial }
      if (next?.role) localStorage.setItem('rmr_session_' + next.role, JSON.stringify({ token, user: next }))
      return next
    })
  }

  const isAuthenticated = () => !!token && !!user
  const isAdmin         = () => user?.role === 'ADMIN'
  const isCustomer      = () => user?.role === 'CUSTOMER'
  const isDriver        = () => user?.role === 'DRIVER'

  return (
    <AuthContext.Provider value={{
      user, token,
      login, logout, updateUser,
      isAuthenticated,
      isAdmin, isCustomer, isDriver,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
