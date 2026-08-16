import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { rentalService } from '../../services/allServices'
import DriverLayout from '../../components/layout/DriverLayout'
import { formatCurrency, formatDate, formatDateTime, getBadgeClass, getStatusInfo } from '../../utils/helpers'
import { RENTAL_STATUS } from '../../utils/constants'
import { FiSearch, FiX, FiEye, FiTruck } from 'react-icons/fi'

export default function DriverRentals() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [rentals,  setRentals]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetchRentals() }, [user.userId])

  const fetchRentals = async () => {
    setLoading(true)
    try {
      const res = await rentalService.getByDriver(user.userId)
      setRentals(res.data.data || [])
    } catch { } finally { setLoading(false) }
  }

  const filtered = rentals.filter(r => {
    const matchFilter = !filter || r.rentalStatus === filter
    const matchSearch = !search ||
      (r.carBrand + ' ' + r.carModel).toLowerCase().includes(search.toLowerCase()) ||
      r.customerName?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <DriverLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="page-title">Assigned Rentals</h2>
          <p className="text-gray-500 text-sm">{rentals.length} rentals assigned to you</p>
        </div>
      </div>

      {/* Status Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {RENTAL_STATUS.map(s => (
          <div key={s.value}
            onClick={() => setFilter(filter === s.value ? '' : s.value)}
            className={'bg-white rounded-xl p-3 border-2 text-center cursor-pointer transition-all ' +
              (filter === s.value ? 'border-sky-400' : 'border-gray-100 hover:border-gray-200')}>
            <p className="text-xl font-bold text-gray-800">
              {rentals.filter(r => r.rentalStatus === s.value).length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card mb-5 flex gap-3 items-center">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-3.5 text-gray-400 text-sm" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="form-input pl-9" placeholder="Search customer or car..." />
        </div>
        {(search || filter) && (
          <button onClick={() => { setSearch(''); setFilter('') }}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500">
            <FiX size={14} /> Clear
          </button>
        )}
      </div>

      {/* Rentals List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-4xl mb-3">🔑</p>
          <p className="font-bold text-gray-700">No rentals found</p>
          <p className="text-gray-400 text-sm mt-1">Rentals assigned to you will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const s = getStatusInfo(RENTAL_STATUS, r.rentalStatus)
            return (
              <div key={r.rentalId} className="card hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center
                                    justify-center text-2xl flex-shrink-0">🚗</div>
                    <div>
                      <h3 className="font-bold text-gray-800">{r.carBrand} {r.carModel}</h3>
                      <p className="text-gray-400 text-xs">{r.carRegistrationNumber}</p>
                      <p className="text-gray-500 text-sm mt-1">👤 {r.customerName}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        {r.actualPickupDatetime && <span>📅 Pickup: {formatDate(r.actualPickupDatetime)}</span>}
                        {r.actualReturnDatetime && <span>🏁 Return: {formatDate(r.actualReturnDatetime)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={getBadgeClass(s.color)}>{s.label}</span>
                    <p className="font-bold text-sky-600">{formatCurrency(r.totalAmount)}</p>
                    <button onClick={() => setSelected(r)}
                      className="flex items-center gap-1.5 text-xs text-blue-500
                                 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg">
                      <FiEye size={12} /> Details
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h3 className="font-bold text-gray-800">Rental #{selected.rentalId}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><FiX size={22} /></button>
            </div>
            <div className="p-6 space-y-2">
              {[
                ['Customer',        selected.customerName],
                ['Car',             selected.carBrand + ' ' + selected.carModel],
                ['Reg Number',      selected.carRegistrationNumber],
                ['Pickup Time',     formatDateTime(selected.actualPickupDatetime)],
                ['Return Time',     selected.actualReturnDatetime ? formatDateTime(selected.actualReturnDatetime) : '—'],
                ['Odometer Pickup', selected.odometerAtPickup + ' km'],
                ['Odometer Return', selected.odometerAtReturn ? selected.odometerAtReturn + ' km' : '—'],
                ['KM Driven',       selected.totalKmDriven ? selected.totalKmDriven + ' km' : '—'],
                ['Base Amount',     formatCurrency(selected.baseAmount)],
                ['Total Amount',    formatCurrency(selected.totalAmount)],
                ['Remarks',         selected.remarks || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className="text-gray-800 text-sm font-medium text-right">{value}</span>
                </div>
              ))}
              {selected.rentalStatus === 'ACTIVE' && (
                <button onClick={() => { setSelected(null); navigate('/driver/pickup-dropoff') }}
                  className="btn-primary w-full py-2.5 mt-3 flex items-center justify-center gap-2">
                  <FiTruck size={15} /> Process Return
                </button>
              )}
              <button onClick={() => setSelected(null)} className="btn-gray w-full py-2.5">Close</button>
            </div>
          </div>
        </div>
      )}
    </DriverLayout>
  )
}
