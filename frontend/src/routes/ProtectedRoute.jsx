import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />
}

export function AdminRoute() {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (!isAdmin())         return <Navigate to="/unauthorized" replace />
  return <Outlet />
}

export function CustomerRoute() {
  const { isAuthenticated, isCustomer } = useAuth()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (!isCustomer())      return <Navigate to="/unauthorized" replace />
  return <Outlet />
}

export function DriverRoute() {
  const { isAuthenticated, isDriver } = useAuth()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (!isDriver())         return <Navigate to="/unauthorized" replace />
  return <Outlet />
}
