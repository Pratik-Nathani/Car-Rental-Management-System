import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { carService, customerService, reservationService, rentalService, paymentService } from '../../services/allServices'
import AdminLayout from '../../components/layout/AdminLayout'
import { formatCurrency, formatDate, getBadgeClass, getStatusInfo } from '../../utils/helpers'
import { RESERVATION_STATUS, RENTAL_STATUS } from '../../utils/constants'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FiTruck, FiUsers, FiCalendar, FiKey, FiDollarSign,
         FiTool, FiAlertCircle, FiArrowRight } from 'react-icons/fi'

export default function AdminDashboard() {
  const [stats,    setStats]    = useState(null)
  const [recent,   setRecent]   = useState({ reservations: [], rentals: [] })
  const [revenue,  setRevenue]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [carsRes, custsRes, resRes, rentsRes, paymentsRes] = await Promise.all([
        carService.getAll(),
        customerService.getAll(),
        reservationService.getAll(),
        rentalService.getAll(),
        paymentService.getAll(),
      ])

      const cars         = carsRes.data.data         || []
      const customers    = custsRes.data.data         || []
      const reservations = resRes.data.data           || []
      const rentals      = rentsRes.data.data         || []
      const payments     = paymentsRes.data.data      || []

      // Build stats
      setStats({
        totalCars:         cars.length,
        availableCars:     cars.filter(c => c.availabilityStatus === 'AVAILABLE').length,
        totalCustomers:    customers.length,
        activeCustomers:   customers.filter(c => c.accountStatus === 'ACTIVE').length,
        totalReservations: reservations.length,
        pendingReservations: reservations.filter(r => r.reservationStatus === 'PENDING').length,
        totalRentals:      rentals.length,
        activeRentals:     rentals.filter(r => r.rentalStatus === 'ACTIVE').length,
        totalRevenue:      payments.filter(p => p.paymentStatus === 'SUCCESS')
                                   .reduce((s, p) => s + (p.totalAmount || 0), 0),
        pendingPayments:   payments.filter(p => p.paymentStatus === 'PENDING').length,
      })

      // Recent data
      setRecent({
        reservations: [...reservations]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6),
        rentals: [...rentals]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
      })

      // Build monthly revenue chart (last 6 months)
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const month = d.toLocaleString('en-IN', { month: 'short' })
        const year  = d.getFullYear()
        const total = payments
          .filter(p => {
            if (!p.paymentDatetime || p.paymentStatus !== 'SUCCESS') return false
            const pd = new Date(p.paymentDatetime)
            return pd.getMonth() === d.getMonth() && pd.getFullYear() === year
          })
          .reduce((s, p) => s + (p.totalAmount || 0), 0)
        months.push({ month, revenue: Math.round(total) })
      }
      setRevenue(months)

    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const STAT_CARDS = stats ? [
    { label: 'Total Cars',      value: stats.totalCars,         sub: stats.availableCars + ' available',     icon: FiTruck,     bg: 'bg-blue-50',   ic: 'text-blue-500',   link: '/admin/cars'         },
    { label: 'Customers',       value: stats.totalCustomers,    sub: stats.activeCustomers + ' active',      icon: FiUsers,     bg: 'bg-green-50',  ic: 'text-green-500',  link: '/admin/customers'    },
    { label: 'Reservations',    value: stats.totalReservations, sub: stats.pendingReservations + ' pending', icon: FiCalendar,  bg: 'bg-yellow-50', ic: 'text-yellow-500', link: '/admin/reservations' },
    { label: 'Active Rentals',  value: stats.activeRentals,     sub: stats.totalRentals + ' total',          icon: FiKey,       bg: 'bg-orange-50', ic: 'text-orange-500', link: '/admin/rentals'      },
    { label: 'Total Revenue',   value: formatCurrency(stats.totalRevenue), sub: stats.pendingPayments + ' pending payments', icon: FiDollarSign, bg: 'bg-purple-50', ic: 'text-purple-500', link: '/admin/payments' },
  ] : []

  return (
    <AdminLayout>

      {/* Welcome */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back! Here's what's happening today.</p>
        </div>
        <button onClick={fetchAll}
          className="btn-gray py-2 px-4 text-sm flex items-center gap-2">
          🔄 Refresh
        </button>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {STAT_CARDS.map(({ label, value, sub, icon: Icon, bg, ic, link }) => (
            <Link key={label} to={link}
              className="stat-card hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
              <div className={'stat-icon ' + bg}>
                <Icon className={ic} size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-800 truncate">{value}</p>
                <p className="text-gray-500 text-xs truncate">{label}</p>
                <p className="text-gray-400 text-xs truncate mt-0.5">{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-6">

        {/* Revenue Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FiDollarSign className="text-orange-500" /> Revenue (Last 6 Months)
            </h3>
          </div>
          {loading ? (
            <div className="h-52 bg-gray-100 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenue} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }}
                  tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                <Tooltip
                  formatter={(v) => [formatCurrency(v), 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f0f0f0', fontSize: '13px' }} />
                <Bar dataKey="revenue" fill="#FF6B00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="section-title">⚡ Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Add New Car',         to: '/admin/cars',         emoji: '🚗' },
              { label: 'Add Driver',          to: '/admin/drivers',      emoji: '🚕' },
              { label: 'View Pending Reservations', to: '/admin/reservations', emoji: '📋' },
              { label: 'Active Rentals',      to: '/admin/rentals',      emoji: '🔑' },
              { label: 'View All Payments',   to: '/admin/payments',     emoji: '💳' },
            ].map(({ label, to, emoji }) => (
              <Link key={to} to={to}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-orange-50
                           rounded-xl transition-colors group">
                <span className="text-sm text-gray-700 group-hover:text-orange-600 flex items-center gap-2">
                  {emoji} {label}
                </span>
                <FiArrowRight size={14} className="text-gray-400 group-hover:text-orange-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Recent Reservations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FiCalendar className="text-orange-500" /> Recent Reservations
            </h3>
            <Link to="/admin/reservations"
              className="text-orange-500 text-xs font-semibold hover:underline">
              View All →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : recent.reservations.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No reservations yet</p>
          ) : (
            <div className="space-y-2">
              {recent.reservations.map(r => {
                const s = getStatusInfo(RESERVATION_STATUS, r.reservationStatus)
                return (
                  <div key={r.reservationId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {r.carBrand} {r.carModel}
                      </p>
                      <p className="text-gray-400 text-xs">{r.customerName} • {formatDate(r.pickupDate)}</p>
                    </div>
                    <div className="text-right">
                      <span className={getBadgeClass(s.color)}>{s.label}</span>
                      <p className="text-xs text-gray-500 mt-1">{formatCurrency(r.estimatedAmount)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Active Rentals */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FiKey className="text-orange-500" /> Active Rentals
            </h3>
            <Link to="/admin/rentals"
              className="text-orange-500 text-xs font-semibold hover:underline">
              View All →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : recent.rentals.filter(r => r.rentalStatus === 'ACTIVE').length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No active rentals</p>
          ) : (
            <div className="space-y-2">
              {recent.rentals.filter(r => r.rentalStatus === 'ACTIVE').map(r => (
                <div key={r.rentalId}
                  className="flex items-center justify-between p-3 bg-orange-50
                             border border-orange-100 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {r.carBrand} {r.carModel}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {r.customerName} • {formatDate(r.actualPickupDatetime)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="badge-info">Active</span>
                    <p className="text-xs text-gray-500 mt-1">{formatCurrency(r.totalAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
