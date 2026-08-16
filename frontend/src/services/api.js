import axios from 'axios'
import { getAuthToken } from './authToken'

// In dev, '/api' is proxied to http://localhost:8080 by vite.config.js.
// In a real deployment (frontend and backend on different hosts), set
// VITE_API_BASE_URL to the backend's full URL, e.g. https://api.yourdomain.com/api
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach JWT token to every request — read from the current tab's in-memory token
// (see authToken.js), not localStorage directly, so multiple roles can stay logged
// in at once across different tabs without overwriting each other's session.
api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.Authorization = 'Bearer ' + token
  return config
}, (error) => Promise.reject(error))

// Handle 401 / 403 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only this tab's role-scoped session is stale — clear just that one.
      const role = window.location.pathname.startsWith('/admin') ? 'ADMIN'
        : window.location.pathname.startsWith('/customer') ? 'CUSTOMER'
        : window.location.pathname.startsWith('/driver') ? 'DRIVER' : null
      if (role) localStorage.removeItem('rmr_session_' + role)
      window.location.href = '/login'
    }
    if (error.response?.status === 403) {
      window.location.href = '/unauthorized'
    }
    return Promise.reject(error)
  }
)

export default api
