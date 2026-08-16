import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { rentalService, reservationService } from '../../services/allServices'
import DriverLayout from '../../components/layout/DriverLayout'
import { formatCurrency } from '../../utils/helpers'
import { FiKey, FiTruck, FiCheckCircle, FiClock } from 'react-icons/fi'

export default function DriverDashboard() {
  const { user } = useAuth()
  const [rentals, setRentals] = useState([])
  const [pendingPickups, setPendingPickups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [user.userId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rentalsRes, pickupsRes] = await Promise.all([
        rentalService.getByDriver(user.userId),
        reservationService.getPendingPickups(user.userId),
      ])
      setRentals(rentalsRes.data.data || [])
      setPendingPickups(pickupsRes.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const activeRentals    = rentals.filter(r => r.rentalStatus === 'ACTIVE')
  const completedRentals = rentals.filter(r => r.rentalStatus === 'COMPLETED')

  const stats = [
    { label: 'Pending Pickups',  value: pendingPickups.length,   icon: FiClock,       bg: 'bg-purple-50', ic: 'text-purple-500' },
    { label: 'Active Now',       value: activeRentals.length,    icon: FiTruck,       bg: 'bg-orange-50', ic: 'text-orange-500' },
    { label: 'Completed',        value: completedRentals.length, icon: FiCheckCircle, bg: 'bg-green-50',  ic: 'text-green-500'  },
  ]

  return (
    <DriverLayout>
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Welcome, {user?.name?.split(' ')[0]}! 👋
        </h2>
        <p className="text-gray-500 mt-1">Ready to handle pickups and returns today!</p>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-white font-bold text-xl mb-1">Pickup or Drop-off a Customer</h3>
          <p className="text-sky-100 text-sm">Start a new trip or close out an ongoing one.</p>
        </div>
        <Link to="/driver/pickup-dropoff"
          className="bg-white text-sky-600 font-bold px-6 py-3 rounded-xl
                     hover:bg-sky-50 transition-all flex items-center gap-2 whitespace-nowrap">
          🚗 Go to Pickup / Drop-off
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, bg, ic }) => (
          <div key={label} className="stat-card">
            <div className={'stat-icon ' + bg}>
              <Icon className={ic} size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{loading ? '—' : value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Pending Pickups */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FiClock className="text-sky-500" /> Pending Pickups
            </h3>
            <Link to="/driver/pickup-dropoff" className="text-sky-500 text-xs font-semibold hover:underline">
              Go to Pickup →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : pendingPickups.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No pending pickups assigned to you</p>
          ) : (
            <div className="space-y-2">
              {pendingPickups.slice(0, 5).map(r => (
                <div key={r.reservationId} className="flex items-center justify-between p-3 bg-purple-50
                                                        border border-purple-100 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{r.carBrand} {r.carModel}</p>
                    <p className="text-gray-400 text-xs">{r.customerName} • {r.pickupDate}</p>
                  </div>
                  <span className="badge-warning">Pending</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Rentals */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FiKey className="text-sky-500" /> My Active Rentals
            </h3>
            <Link to="/driver/rentals" className="text-sky-500 text-xs font-semibold hover:underline">
              View All →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : activeRentals.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No active rentals assigned</p>
          ) : (
            <div className="space-y-2">
              {activeRentals.slice(0, 5).map(r => (
                <div key={r.rentalId} className="flex items-center justify-between p-3 bg-orange-50
                                                  border border-orange-100 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{r.carBrand} {r.carModel}</p>
                    <p className="text-gray-400 text-xs">{r.customerName} • {r.carRegistrationNumber}</p>
                  </div>
                  <span className="badge-info">Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DriverLayout>
  )
}
