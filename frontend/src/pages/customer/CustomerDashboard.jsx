import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { reservationService, rentalService } from '../../services/allServices'
import CustomerLayout from '../../components/layout/CustomerLayout'
import { formatCurrency, formatDate, getBadgeClass, getStatusInfo } from '../../utils/helpers'
import { RESERVATION_STATUS, RENTAL_STATUS } from '../../utils/constants'
import { FiCalendar, FiTruck, FiSearch, FiClock, FiCheckCircle } from 'react-icons/fi'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const [reservations, setReservations] = useState([])
  const [rentals, setRentals]           = useState([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resRes, renRes] = await Promise.all([
          reservationService.getByCustomer(user.userId),
          rentalService.getByCustomer(user.userId),
        ])
        setReservations(resRes.data.data || [])
        setRentals(renRes.data.data || [])
      } catch (err) {
        console.error('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user.userId])

  const activeRentals     = rentals.filter(r => r.rentalStatus === 'ACTIVE')
  const completedRentals  = rentals.filter(r => r.rentalStatus === 'COMPLETED')
  const pendingReservations = reservations.filter(r => r.reservationStatus === 'PENDING')
  const recentReservations  = [...reservations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)

  const stats = [
    { label: 'Total Bookings',   value: reservations.length,     icon: FiCalendar,    bg: 'bg-blue-50',   ic: 'text-blue-500'   },
    { label: 'Active Rentals',   value: activeRentals.length,    icon: FiTruck,       bg: 'bg-orange-50', ic: 'text-orange-500' },
    { label: 'Completed Trips',  value: completedRentals.length, icon: FiCheckCircle, bg: 'bg-green-50',  ic: 'text-green-500'  },
    { label: 'Pending Requests', value: pendingReservations.length, icon: FiClock,    bg: 'bg-yellow-50', ic: 'text-yellow-500' },
  ]

  return (
    <CustomerLayout>
      {/* Welcome */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h2>
        <p className="text-gray-500 mt-1">Here's what's happening with your rentals.</p>
      </div>

      {/* Quick Action */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 mb-8 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-xl mb-1">Need a car?</h3>
          <p className="text-orange-100 text-sm">Browse our fleet and book your perfect ride today.</p>
        </div>
        <Link to="/customer/cars" className="bg-white text-orange-500 font-bold px-6 py-3
                                             rounded-xl hover:bg-orange-50 transition-all flex items-center gap-2 whitespace-nowrap">
          <FiSearch size={16} /> Browse Cars
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, bg, ic }) => (
          <div key={label} className="stat-card">
            <div className={'stat-icon ' + bg}>
              <Icon className={ic} size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {loading ? '—' : value}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Reservations */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FiCalendar className="text-orange-500" /> Recent Bookings
            </h3>
            <Link to="/customer/bookings" className="text-orange-500 text-xs font-semibold hover:underline">
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentReservations.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">🚗</p>
              <p className="text-gray-500 text-sm">No bookings yet</p>
              <Link to="/customer/cars" className="text-orange-500 text-sm font-semibold mt-2 inline-block hover:underline">
                Book your first car →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReservations.map(r => {
                const status = getStatusInfo(RESERVATION_STATUS, r.reservationStatus)
                return (
                  <div key={r.reservationId} className="flex items-center justify-between
                                                         p-3 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {r.carBrand} {r.carModel}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {formatDate(r.pickupDate)} → {formatDate(r.returnDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={'text-xs ' + getBadgeClass(status.color)}>
                        {status.label}
                      </span>
                      <p className="text-gray-600 text-xs font-semibold mt-1">
                        {formatCurrency(r.estimatedAmount)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Active Rental */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FiTruck className="text-orange-500" /> Active Rental
            </h3>
          </div>

          {loading ? (
            <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ) : activeRentals.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">🚗</p>
              <p className="text-gray-500 text-sm">No active rental</p>
              <p className="text-gray-400 text-xs mt-1">Your active rentals will appear here</p>
            </div>
          ) : (
            activeRentals.map(r => (
              <div key={r.rentalId} className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800">{r.carBrand} {r.carModel}</p>
                    <p className="text-gray-500 text-xs">{r.carRegistrationNumber}</p>
                  </div>
                  <span className="badge-info">Active</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white rounded-lg p-2.5">
                    <p className="text-gray-400">Pickup</p>
                    <p className="font-semibold text-gray-700 mt-0.5">{formatDate(r.actualPickupDatetime)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5">
                    <p className="text-gray-400">Base Amount</p>
                    <p className="font-semibold text-gray-700 mt-0.5">{formatCurrency(r.baseAmount)}</p>
                  </div>
                </div>
                {r.driverName && (
                  <p className="text-xs text-gray-500 mt-2">
                    🚕 Driver: <strong>{r.driverName}</strong>
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </CustomerLayout>
  )
}
