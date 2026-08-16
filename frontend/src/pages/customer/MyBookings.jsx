import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { reservationService, rentalService, paymentService } from '../../services/allServices'
import { useLanguage } from '../../context/LanguageContext'
import CustomerLayout from '../../components/layout/CustomerLayout'
import { formatCurrency, formatDate, getBadgeClass, getStatusInfo, toLocalDateStr } from '../../utils/helpers'
import { RESERVATION_STATUS, RENTAL_STATUS } from '../../utils/constants'
import { FiCalendar, FiTruck, FiX, FiDownload, FiStar, FiSearch } from 'react-icons/fi'

const TABS = [
  { key: 'reservations', label: 'Reservations', icon: FiCalendar },
  { key: 'rentals',      label: 'Rentals',      icon: FiTruck    },
]

// Shown in either tab when a search term matches nothing — same markup, so it's
// pulled out once instead of being repeated per tab.
function NoSearchResults({ search, onClear }) {
  return (
    <div className="text-center py-16 card">
      <p className="text-4xl mb-3">🔍</p>
      <p className="text-lg font-bold text-gray-700">No matches for "{search}"</p>
      <button onClick={onClear} className="text-orange-500 text-sm font-semibold mt-2">
        Clear search
      </button>
    </div>
  )
}

export default function MyBookings() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const { t }      = useLanguage()
  const [tab, setTab]               = useState('reservations')
  const [search, setSearch]         = useState('')
  const [sortBy, setSortBy]         = useState('newest') // newest | oldest | pickupDate
  const [reservations, setReservations] = useState([])
  const [rentals, setRentals]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [cancelling, setCancelling]     = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null) // reservation object pending cancellation confirmation
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [newPickupDate, setNewPickupDate] = useState('')
  const [newPickupTime, setNewPickupTime] = useState('')
  const [newReturnDate, setNewReturnDate] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [extendTarget, setExtendTarget] = useState(null)
  const [extendReturnDate, setExtendReturnDate] = useState('')
  const [extendCurrentReturnDate, setExtendCurrentReturnDate] = useState('')
  const [extending, setExtending] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [user.userId])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [resRes, renRes] = await Promise.all([
        reservationService.getByCustomer(user.userId),
        rentalService.getByCustomer(user.userId),
      ])
      setReservations(resRes.data.data || [])
      setRentals(renRes.data.data || [])
    } catch {
      toast.error('Failed to load bookings.')
    } finally {
      setLoading(false)
    }
  }

  const handleExtend = async () => {
    if (!extendReturnDate) { toast.error('Pick a new return date.'); return }
    setExtending(true)
    try {
      const res = await rentalService.extend(extendTarget.rentalId, { newReturnDate: extendReturnDate })
      const result = res.data.data
      toast.success(result.message || 'Rental extended!')
      setExtendTarget(null)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Extend failed.')
    } finally {
      setExtending(false)
    }
  }

  const handleReschedule = async () => {
    if (!newPickupDate || !newReturnDate) { toast.error('Pick both dates.'); return }
    if (newReturnDate < newPickupDate) { toast.error('Return date cannot be before pickup date.'); return }
    setRescheduling(true)
    try {
      const res = await reservationService.reschedule(rescheduleTarget.reservationId, {
        newPickupDate, newPickupTime, newReturnDate,
      })
      const result = res.data.data
      toast.success(result.message || 'Booking rescheduled!')
      setRescheduleTarget(null)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reschedule failed.')
    } finally {
      setRescheduling(false)
    }
  }

  const handleCancel = async (reservationId) => {
    setCancelling(reservationId)
    try {
      const res = await reservationService.cancel(reservationId)
      const result = res.data.data
      if (result?.freeCancellation) {
        toast.success('Cancelled free of charge — full refund of ' + formatCurrency(result.refundAmount) + '.')
      } else if (result) {
        toast.success('Cancelled. ' + formatCurrency(result.cancellationFee) + ' fee deducted — refund: ' + formatCurrency(result.refundAmount) + '.')
      } else {
        toast.success('Reservation cancelled.')
      }
      setCancelTarget(null)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed.')
    } finally {
      setCancelling(null)
    }
  }

  // Hours remaining until pickup — used to show whether cancellation is free or fee applies
  const hoursUntilPickup = (reservation) => {
    if (!reservation?.pickupDate) return null
    const pickupDateTime = new Date(reservation.pickupDate + 'T' + (reservation.pickupTime || '09:00'))
    return (pickupDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
  }

  const handleViewReceipt = async (reservationId) => {
    try {
      const res = await paymentService.getByReservation(reservationId)
      const latest = (res.data.data || [])[0]
      if (!latest) { toast.error('No payment found for this booking yet.'); return }
      navigate('/customer/receipt/' + latest.paymentId)
    } catch {
      toast.error('Could not load receipt.')
    }
  }

  const handleDownloadReceipt = async (reservationId) => {
    try {
      const pdfRes = await paymentService.downloadConsolidatedReceipt(reservationId)
      const url = window.URL.createObjectURL(new Blob([pdfRes.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'bill-RES-' + reservationId + '.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.response?.data?.message || 'No payment found for this booking yet.')
    }
  }

  const canCancel = (status) => ['PENDING', 'CONFIRMED'].includes(status)
  const canFeedback = (status) => status === 'COMPLETED'

  // Shared search + sort across both tabs — matches on car, registration number, locations,
  // or the booking ID itself (typed with or without the "RES-"/"RENT-" prefix).
  const filterAndSort = (list, idKey) => {
    const q = search.trim().toLowerCase()
    let result = !q ? list : list.filter(r => {
      const haystack = [
        r.carBrand, r.carModel, r.carRegistrationNumber,
        r.pickupLocation, r.dropLocation, String(r[idKey]),
      ].join(' ').toLowerCase()
      return haystack.includes(q)
    })
    result = [...result].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt)
      if (sortBy === 'pickupDate') return new Date(a.pickupDate) - new Date(b.pickupDate)
      return new Date(b.createdAt) - new Date(a.createdAt) // newest first (default)
    })
    return result
  }


  return (
    <CustomerLayout>
      <div className="page-title mb-6">{t('myBookings')}</div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ' +
              (tab === key ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <Icon size={15} /> {label}
            <span className={'text-xs px-1.5 py-0.5 rounded-full ' +
              (tab === key ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-500')}>
              {key === 'reservations' ? reservations.length : rentals.length}
            </span>
          </button>
        ))}
      </div>

      {/* Tab explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-xs text-blue-700">
        {tab === 'reservations'
          ? <><strong>Reservations</strong> = your online bookings (dates, route, payment). Pay/cancel from here.</>
          : <><strong>Rentals</strong> = the actual car handover record, created by our staff once you physically pick up the car. Once a rental is marked <strong>Completed</strong> (car returned), a <strong>Feedback</strong> button appears here.</>}
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by car, registration number, location, or booking ID..."
            className="form-input pl-10 w-full"
          />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="form-input sm:w-52">
          <option value="newest">Newest booked first</option>
          <option value="oldest">Oldest booked first</option>
          <option value="pickupDate">Pickup date (earliest first)</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : (

        /* ── Reservations Tab ── */
        tab === 'reservations' ? (
          reservations.length === 0 ? (
            <div className="text-center py-20 card">
              <p className="text-5xl mb-4">📋</p>
              <p className="text-xl font-bold text-gray-700 mb-2">No reservations yet</p>
              <p className="text-gray-400 text-sm mb-5">Start by browsing available cars</p>
              <button onClick={() => navigate('/customer/cars')} className="btn-primary">
                Browse Cars
              </button>
            </div>
          ) : filterAndSort(reservations, 'reservationId').length === 0 ? (
            <NoSearchResults search={search} onClear={() => setSearch('')} />
          ) : (
            <div className="space-y-4">
              {filterAndSort(reservations, 'reservationId')
                .map(r => {
                  const status = getStatusInfo(RESERVATION_STATUS, r.reservationStatus)
                  return (
                    <div key={r.reservationId}
                      className="card hover:shadow-lg transition-shadow duration-200">
                      <div className="flex flex-wrap items-start justify-between gap-4">

                        {/* Left Info */}
                        <div className="flex gap-4 items-start">
                          <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center
                                          justify-center text-2xl flex-shrink-0">🚗</div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-base">
                              {r.carBrand} {r.carModel}
                            </h3>
                            <p className="text-gray-400 text-xs mt-0.5">{r.carRegistrationNumber}</p>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                              <span>📅 {formatDate(r.pickupDate)} → {formatDate(r.returnDate)}</span>
                              <span>🗓️ {r.totalDays} day{r.totalDays > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-500">
                              <span>📍 {r.pickupLocation}</span>
                              {r.viaLocations && <span>→ {r.viaLocations}</span>}
                              <span>→ {r.dropLocation}</span>
                            </div>
                            {r.assignedDriverName && (
                              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5 text-xs text-blue-700">
                                🚕 <strong>{r.assignedDriverName}</strong> — {r.assignedDriverMobile}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Info */}
                        <div className="flex flex-col items-end gap-3">
                          <span className={getBadgeClass(status.color)}>{status.label}</span>
                          <p className="font-bold text-orange-500 text-lg">
                            {formatCurrency(r.estimatedAmount)}
                          </p>
                          {r.balanceDue > 0 ? (
                            <p className="text-red-500 text-xs">Balance due: {formatCurrency(r.balanceDue)}</p>
                          ) : (
                            <p className="text-green-500 text-xs">Fully paid</p>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 flex-wrap justify-end">
                            {r.balanceDue > 0 && r.reservationStatus !== 'CANCELLED' && (
                              <button
                                onClick={() => navigate('/customer/booking-payment/' + r.reservationId)}
                                className="flex items-center gap-1.5 text-xs text-blue-500
                                           border border-blue-200 hover:bg-blue-50 px-3 py-1.5
                                           rounded-lg transition-all">
                                💳 Pay Now
                              </button>
                            )}
                            {canCancel(r.reservationStatus) && (
                              <button
                                onClick={() => {
                                  setRescheduleTarget(r)
                                  setNewPickupDate(r.pickupDate)
                                  setNewPickupTime(r.pickupTime || '09:00')
                                  setNewReturnDate(r.returnDate)
                                }}
                                className="flex items-center gap-1.5 text-xs text-purple-500
                                           border border-purple-200 hover:bg-purple-50 px-3 py-1.5
                                           rounded-lg transition-all">
                                📅 Reschedule
                              </button>
                            )}
                            {canCancel(r.reservationStatus) && (
                              <button
                                onClick={() => setCancelTarget(r)}
                                disabled={cancelling === r.reservationId}
                                className="flex items-center gap-1.5 text-xs text-red-500
                                           border border-red-200 hover:bg-red-50 px-3 py-1.5
                                           rounded-lg transition-all disabled:opacity-50">
                                <FiX size={12} />
                                {cancelling === r.reservationId ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}
                            {r.amountPaid > 0 && (
                              <button
                                onClick={() => handleViewReceipt(r.reservationId)}
                                className="flex items-center gap-1.5 text-xs text-green-500
                                           border border-green-200 hover:bg-green-50 px-3 py-1.5
                                           rounded-lg transition-all">
                                <FiDownload size={12} /> Receipt
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Reservation ID */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                          Booking ID: <span className="font-mono font-semibold text-gray-600">
                            #RES-{r.reservationId}
                          </span>
                          {r.tripType && (
                            <span className="ml-2">{r.tripType === 'OUTSTATION' ? '🛣️ Outstation' : '🏙️ Local'}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          Booked on: {formatDate(r.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })}
            </div>
          )

        ) : (
          /* ── Rentals Tab ── */
          rentals.length === 0 ? (
            <div className="text-center py-20 card">
              <p className="text-5xl mb-4">🚗</p>
              <p className="text-xl font-bold text-gray-700 mb-2">No rental history yet</p>
              <p className="text-gray-400 text-sm">
                A rental appears here once staff hand over the car for a confirmed reservation.
              </p>
            </div>
          ) : filterAndSort(rentals, 'rentalId').length === 0 ? (
            <NoSearchResults search={search} onClear={() => setSearch('')} />
          ) : (
            <div className="space-y-4">
              {filterAndSort(rentals, 'rentalId')
                .map(r => {
                  const status = getStatusInfo(RENTAL_STATUS, r.rentalStatus)
                  return (
                    <div key={r.rentalId} className="card hover:shadow-lg transition-shadow duration-200">
                      <div className="flex flex-wrap items-start justify-between gap-4">

                        {/* Left */}
                        <div className="flex gap-4 items-start">
                          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center
                                          justify-center text-2xl flex-shrink-0">🚙</div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-base">
                              {r.carBrand} {r.carModel}
                            </h3>
                            <p className="text-gray-400 text-xs mt-0.5">{r.carRegistrationNumber}</p>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                              {r.actualPickupDatetime && (
                                <span>🚀 {formatDate(r.actualPickupDatetime)}</span>
                              )}
                              {r.actualReturnDatetime && (
                                <span>🏁 {formatDate(r.actualReturnDatetime)}</span>
                              )}
                              {r.totalKmDriven && (
                                <span>📍 {r.totalKmDriven} km driven</span>
                              )}
                            </div>
                            {r.driverName && (
                              <p className="text-xs text-gray-400 mt-1">
                                🚕 Driver: {r.driverName}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right */}
                        <div className="flex flex-col items-end gap-3">
                          <span className={getBadgeClass(status.color)}>{status.label}</span>
                          <p className="font-bold text-orange-500 text-lg">
                            {formatCurrency(r.totalAmount)}
                          </p>

                          {/* Actions */}
                          <div className="flex gap-2 flex-wrap justify-end">
                            {canFeedback(r.rentalStatus) && (
                              <button
                                onClick={() => navigate('/customer/feedback/' + r.rentalId)}
                                className="flex items-center gap-1.5 text-xs text-white font-semibold
                                           bg-orange-500 hover:bg-orange-600 px-3.5 py-1.5
                                           rounded-lg transition-all shadow-sm">
                                <FiStar size={12} /> Give Feedback
                              </button>
                            )}
                            {r.rentalStatus === 'ACTIVE' && (
                              <button
                                onClick={() => navigate('/customer/payment/' + r.rentalId)}
                                className="flex items-center gap-1.5 text-xs text-blue-500
                                           border border-blue-200 hover:bg-blue-50 px-3 py-1.5
                                           rounded-lg transition-all">
                                💳 Pay Now
                              </button>
                            )}
                            {r.rentalStatus === 'ACTIVE' && (
                              <button
                                onClick={async () => {
                                  setExtendTarget(r)
                                  setExtendReturnDate('')
                                  try {
                                    const res = await reservationService.getById(r.reservationId)
                                    setExtendCurrentReturnDate(res.data.data?.returnDate || '')
                                  } catch { setExtendCurrentReturnDate('') }
                                }}
                                className="flex items-center gap-1.5 text-xs text-purple-500
                                           border border-purple-200 hover:bg-purple-50 px-3 py-1.5
                                           rounded-lg transition-all">
                                ⏳ Extend Rental
                              </button>
                            )}
                            {r.rentalStatus === 'COMPLETED' && (
                              <button
                                onClick={() => handleDownloadReceipt(r.reservationId)}
                                className="flex items-center gap-1.5 text-xs text-green-500
                                           border border-green-200 hover:bg-green-50 px-3 py-1.5
                                           rounded-lg transition-all">
                                <FiDownload size={12} /> Receipt
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rental ID */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                          Rental ID: <span className="font-mono font-semibold text-gray-600">
                            #REN-{r.rentalId}
                          </span>
                        </p>
                        <div className="flex gap-4 text-xs text-gray-400">
                          {r.damageCharges > 0 && (
                            <span className="text-red-400">
                              Damage: {formatCurrency(r.damageCharges)}
                            </span>
                          )}
                          {r.discountAmount > 0 && (
                            <span className="text-green-500">
                              Discount: {formatCurrency(r.discountAmount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )
        )
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
             onClick={() => setRescheduleTarget(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center text-2xl mb-4">
              📅
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Reschedule this booking?</h3>
            <p className="text-gray-500 text-sm mb-4">
              {rescheduleTarget.carBrand} {rescheduleTarget.carModel} — Booking #RES-{rescheduleTarget.reservationId}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="form-label">New Pickup Date</label>
                <input type="date" value={newPickupDate} min={toLocalDateStr(new Date())}
                  onChange={e => setNewPickupDate(e.target.value)} className="form-input text-sm" />
              </div>
              <div>
                <label className="form-label">New Pickup Time</label>
                <input type="time" value={newPickupTime}
                  onChange={e => setNewPickupTime(e.target.value)} className="form-input text-sm" />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label">New Return Date</label>
              <input type="date" value={newReturnDate} min={newPickupDate}
                onChange={e => setNewReturnDate(e.target.value)} className="form-input text-sm" />
            </div>

            {(() => {
              const hrs = hoursUntilPickup(rescheduleTarget)
              const isFree = hrs === null || hrs >= 12
              return (
                <div className={'rounded-xl p-3 mb-5 text-xs ' +
                  (isFree ? 'bg-green-50 border border-green-200 text-green-700'
                          : 'bg-orange-50 border border-orange-200 text-orange-700')}>
                  {isFree
                    ? '✅ Free reschedule — 12+ hours before your original pickup.'
                    : '⏰ Within 12 hours of original pickup — a ₹300 reschedule fee will apply.'}
                  {' '}Price will be recalculated for the new dates.
                </div>
              )
            })()}

            <div className="flex gap-3">
              <button onClick={() => setRescheduleTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleReschedule} disabled={rescheduling}
                className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-sm disabled:opacity-60">
                {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Rental Modal */}
      {extendTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
             onClick={() => setExtendTarget(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center text-2xl mb-4">
              ⏳
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Extend This Rental</h3>
            <p className="text-gray-500 text-sm mb-4">
              {extendTarget.carBrand} {extendTarget.carModel}
              {extendCurrentReturnDate && <> — current return: <strong>{formatDate(extendCurrentReturnDate)}</strong></>}
            </p>

            <div className="mb-4">
              <label className="form-label">New Return Date</label>
              <input type="date" value={extendReturnDate}
                min={extendCurrentReturnDate || toLocalDateStr(new Date())}
                onChange={e => setExtendReturnDate(e.target.value)} className="form-input" />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-xs text-blue-700">
              Extra charge is calculated per extra day/night at your original booking's rate,
              and gets added to your balance due — no need to make a new booking.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setExtendTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleExtend} disabled={extending}
                className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-sm disabled:opacity-60">
                {extending ? 'Extending...' : 'Confirm Extend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
             onClick={() => setCancelTarget(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center text-2xl mb-4">
              ⚠️
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Cancel this booking?</h3>
            <p className="text-gray-500 text-sm mb-4">
              {cancelTarget.carBrand} {cancelTarget.carModel} — Booking #RES-{cancelTarget.reservationId}
            </p>

            {(() => {
              const hrs = hoursUntilPickup(cancelTarget)
              const isFree = hrs === null || hrs >= 12
              return (
                <div className={'rounded-xl p-4 mb-5 text-sm ' +
                  (isFree ? 'bg-green-50 border border-green-200 text-green-700'
                          : 'bg-red-50 border border-red-200 text-red-700')}>
                  {isFree ? (
                    <p>✅ You're cancelling <strong>12+ hours before pickup</strong> — this is a <strong>free cancellation</strong>, full refund of any amount paid.</p>
                  ) : (
                    <p>⏰ Pickup is <strong>less than 12 hours away</strong> — a <strong>₹500 cancellation fee</strong> will be deducted from your refund.</p>
                  )}
                </div>
              )
            })()}

            <div className="flex gap-3">
              <button onClick={() => setCancelTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                Keep Booking
              </button>
              <button onClick={() => handleCancel(cancelTarget.reservationId)}
                disabled={cancelling === cancelTarget.reservationId}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm disabled:opacity-60">
                {cancelling === cancelTarget.reservationId ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  )
}
