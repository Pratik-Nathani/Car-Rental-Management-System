// ── Format Currency ───────────────────────────────────────
export function formatCurrency(amount) {
  if (amount == null) return '₹0.00'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2,
  }).format(amount)
}

// ── Local date -> 'YYYY-MM-DD' ─────────────────────────────
// IMPORTANT: never use `date.toISOString().split('T')[0]` for a local Date object —
// toISOString() converts to UTC first, which shifts the date back by a day for any
// timezone ahead of UTC (like IST, UTC+5:30). This uses the Date's LOCAL
// year/month/day components instead, so the string always matches what's on screen.
export function toLocalDateStr(date) {
  const d = date instanceof Date ? date : new Date(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// ── Format Date ───────────────────────────────────────────
export function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Format DateTime ───────────────────────────────────────
export function formatDateTime(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Calculate Days Between Dates ──────────────────────────
export function calculateDays(pickupDate, returnDate) {
  if (!pickupDate || !returnDate) return 0
  const diff = new Date(returnDate) - new Date(pickupDate)
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// ── Calculate GST (18% = 9% CGST + 9% SGST) ─────────────
export function calculateGST(baseAmount) {
  const cgst  = (baseAmount * 9) / 100
  const sgst  = (baseAmount * 9) / 100
  const total = cgst + sgst
  return { cgst, sgst, totalGst: total, grandTotal: baseAmount + total }
}

// ── Get badge CSS class from color string ─────────────────
export function getBadgeClass(color) {
  const map = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger:  'badge-danger',
    info:    'badge-info',
    gray:    'badge-gray',
    orange:  'badge-orange',
  }
  return map[color] || 'badge-gray'
}

// ── Find status info from list ────────────────────────────
export function getStatusInfo(list, value) {
  return list.find(s => s.value === value) || { label: value, color: 'gray' }
}

// ── Truncate long text ────────────────────────────────────
export function truncate(text, max = 30) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '...' : text
}

// ── Format phone number ───────────────────────────────────
export function formatPhone(phone) {
  if (!phone) return '—'
  return '+91 ' + phone.slice(0, 5) + ' ' + phone.slice(5)
}

// ── Resolve an uploaded file's URL (Aadhar/DL photos, etc) ────────────────
// The backend returns paths like "/uploads/xyz.jpg". In dev this is proxied
// to the backend by vite.config.js, but a deployed frontend usually lives on
// a different host than the backend — so a bare "/uploads/xyz.jpg" would
// resolve against the frontend's own origin and 404. This rewrites it to
// point at the backend's actual origin.
export function getFileUrl(path) {
  if (!path) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const backendOrigin = apiBase.replace(/\/api\/?$/, '')
  return backendOrigin + path
}
