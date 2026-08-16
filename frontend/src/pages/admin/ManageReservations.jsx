import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { reservationService, driverService } from '../../services/allServices'
import AdminLayout from '../../components/layout/AdminLayout'
import { formatCurrency, formatDate, getBadgeClass, getStatusInfo } from '../../utils/helpers'
import { RESERVATION_STATUS } from '../../utils/constants'
import { FiSearch, FiX, FiEye, FiCheck, FiXCircle, FiTruck } from 'react-icons/fi'

export default function ManageReservations() {
  const [reservations, setReservations] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('PENDING')
  const [selected,  setSelected]  = useState(null)
  const [updating,  setUpdating]  = useState(null)
  const [drivers,   setDrivers]   = useState([])
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    fetchReservations()
    driverService.getAll().then(res => setDrivers((res.data.data || []).filter(d => d.status === 'ACTIVE'))).catch(() => {})
  }, [])

  const fetchReservations = async () => {
    setLoading(true)
    try {
      const res = await reservationService.getAll()
      setReservations(res.data.data || [])
    } catch { toast.error('Failed to load reservations.') }
    finally { setLoading(false) }
  }

  const handleStatusUpdate = async (reservationId, status, remarks = '') => {
    setUpdating(reservationId)
    try {
      await reservationService.updateStatus(reservationId, { reservationStatus: status, remarks })
      toast.success('Reservation ' + status.toLowerCase() + '!')
      fetchReservations()
      setSelected(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.')
    } finally { setUpdating(null) }
  }

  const handleAssignDriver = async (reservationId) => {
    if (!selectedDriverId) { toast.error('Select a driver first.'); return }
    setAssigning(true)
    try {
      await reservationService.assignDriver(reservationId, Number(selectedDriverId))
      toast.success('Driver assigned! Customer has been notified.')
      fetchReservations()
      setSelected(prev => prev ? { ...prev, assignedDriverId: Number(selectedDriverId),
        assignedDriverName: drivers.find(d => d.driverId === Number(selectedDriverId))?.firstName + ' ' +
          drivers.find(d => d.driverId === Number(selectedDriverId))?.lastName } : null)
      setSelectedDriverId('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign driver.')
    } finally {
      setAssigning(false)
    }
  }

  const filtered = reservations.filter(r => {
    const matchFilter = !filter || r.reservationStatus === filter
    const matchSearch = !search ||
      (r.carBrand + ' ' + r.carModel).toLowerCase().includes(search.toLowerCase()) ||
      r.customerName?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="page-title">Manage Reservations</h2>
          <p className="text-gray-500 text-sm">{reservations.length} total reservations</p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setFilter('')}
          className={'px-4 py-2 rounded-xl text-sm font-semibold transition-all ' +
            (!filter ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-400')}>
          All ({reservations.length})
        </button>
        {RESERVATION_STATUS.map(s => (
          <button key={s.value} onClick={() => setFilter(s.value)}
            className={'px-4 py-2 rounded-xl text-sm font-semibold transition-all ' +
              (filter === s.value ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-400')}>
            {s.label} ({reservations.filter(r => r.reservationStatus === s.value).length})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card mb-5 flex gap-3 items-center">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-3.5 text-gray-400 text-sm" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="form-input pl-9" placeholder="Search customer or car..." />
        </div>
        {search && (
          <button onClick={() => setSearch('')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500">
            <FiX size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-gray-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-bold text-gray-700">No reservations found</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>#ID</th>
                <th>Customer</th>
                <th>Car</th>
                <th>Pickup Date</th>
                <th>Return Date</th>
                <th>Days</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Driver</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const s = getStatusInfo(RESERVATION_STATUS, r.reservationStatus)
                return (
                  <tr key={r.reservationId}>
                    <td className="font-mono text-xs text-gray-400">#{r.reservationId}</td>
                    <td>
                      <p className="font-semibold text-gray-800 text-sm">{r.customerName}</p>
                    </td>
                    <td>
                      <p className="font-semibold text-gray-800 text-sm">{r.carBrand} {r.carModel}</p>
                      <p className="text-gray-400 text-xs">{r.carRegistrationNumber}</p>
                    </td>
                    <td className="text-sm text-gray-600">{formatDate(r.pickupDate)}</td>
                    <td className="text-sm text-gray-600">{formatDate(r.returnDate)}</td>
                    <td className="text-center text-sm font-semibold text-gray-700">{r.totalDays}</td>
                    <td className="font-semibold text-orange-500">{formatCurrency(r.estimatedAmount)}</td>
                    <td><span className={getBadgeClass(s.color)}>{s.label}</span></td>
                    <td>
                      {r.assignedDriverName ? (
                        <span className="text-xs text-blue-600 font-medium">🚕 {r.assignedDriverName}</span>
                      ) : (
                        <span className="text-xs text-gray-300">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelected(r)}
                          className="w-7 h-7 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center text-blue-500">
                          <FiEye size={12} />
                        </button>
                        {r.reservationStatus === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(r.reservationId, 'CONFIRMED')}
                              disabled={updating === r.reservationId}
                              className="w-7 h-7 bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-center text-green-500 disabled:opacity-50">
                              <FiCheck size={12} />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(r.reservationId, 'REJECTED')}
                              disabled={updating === r.reservationId}
                              className="w-7 h-7 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center text-red-500 disabled:opacity-50">
                              <FiXCircle size={12} />
                            </button>
                          </>
                        )}
                        {r.reservationStatus === 'CONFIRMED' && (
                          <button
                            onClick={() => handleStatusUpdate(r.reservationId, 'CANCELLED')}
                            disabled={updating === r.reservationId}
                            className="w-7 h-7 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center text-red-500 disabled:opacity-50">
                            <FiXCircle size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-gray-800">Reservation #{selected.reservationId}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><FiX size={22} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[
                ['Customer',      selected.customerName],
                ['Car',           selected.carBrand + ' ' + selected.carModel],
                ['Reg Number',    selected.carRegistrationNumber],
                ['Pickup Date',   formatDate(selected.pickupDate)],
                ['Return Date',   formatDate(selected.returnDate)],
                ['Total Days',    selected.totalDays + ' days'],
                ['Pickup Loc',    selected.pickupLocation],
                ['Drop Loc',      selected.dropLocation],
                ['Est. Amount',   formatCurrency(selected.estimatedAmount)],
                ['Special Req',   selected.specialRequests || '—'],
                ['Booked On',     formatDate(selected.createdAt)],
                ['Assigned Driver', selected.assignedDriverName
                    ? selected.assignedDriverName + ' (' + selected.assignedDriverMobile + ')' : 'Not assigned yet'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className="text-gray-800 text-sm font-medium text-right max-w-48">{value}</span>
                </div>
              ))}

              {/* Assign Driver */}
              {selected.reservationStatus !== 'CANCELLED' && selected.reservationStatus !== 'REJECTED' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                    <FiTruck size={12} /> {selected.assignedDriverName ? 'Reassign Driver' : 'Assign a Driver'}
                  </p>
                  <div className="flex gap-2">
                    <select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}
                      className="form-select flex-1 text-sm">
                      <option value="">Select driver...</option>
                      {drivers.map(d => (
                        <option key={d.driverId} value={d.driverId}>{d.firstName} {d.lastName} — {d.mobileNumber}</option>
                      ))}
                    </select>
                    <button onClick={() => handleAssignDriver(selected.reservationId)} disabled={assigning}
                      className="btn-primary px-4 text-sm disabled:opacity-60">
                      {assigning ? '...' : 'Assign'}
                    </button>
                  </div>
                  <p className="text-blue-500 text-[11px]">Customer & driver both get notified (SMS/WhatsApp/email) with trip details. A driver already busy on these dates can't be assigned.</p>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                {selected.reservationStatus === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(selected.reservationId, 'CONFIRMED')}
                      className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
                      <FiCheck size={14} /> Confirm
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selected.reservationId, 'REJECTED')}
                      className="btn-danger flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
                      <FiXCircle size={14} /> Reject
                    </button>
                  </>
                )}
                <button onClick={() => setSelected(null)} className="btn-gray flex-1 py-2.5 text-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
