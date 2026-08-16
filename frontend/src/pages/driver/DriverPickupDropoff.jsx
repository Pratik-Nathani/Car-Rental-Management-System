import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { rentalService, reservationService } from '../../services/allServices'
import DriverLayout from '../../components/layout/DriverLayout'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { FiMapPin, FiCornerUpLeft, FiSave, FiCheckCircle, FiPhone, FiNavigation, FiUser, FiClock } from 'react-icons/fi'

// Driver flow (this is a passenger pickup, not a car handover):
//   1. PICKUP  — driver goes to the customer's pickup location, confirms who they're picking up
//                and where they're headed, then starts the trip (records start odometer).
//   2. DROP    — after driving the customer to their destination, the driver ends the trip by
//                entering the final odometer reading. That's what triggers the fare calculation —
//                the customer's dashboard then shows exactly how much balance is left to pay.
export default function DriverPickupDropoff() {
  const { user } = useAuth()
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const [mode, setMode]                     = useState('pickup') // 'pickup' | 'drop'
  const [todaysTrips, setTodaysTrips]       = useState([])
  const [futureTrips, setFutureTrips]       = useState([])
  const [ongoingTrips, setOngoingTrips]     = useState([])
  const [selectedTrip, setSelectedTrip]     = useState(null)
  const [selectedOngoing, setSelectedOngoing] = useState(null)
  const [loading, setLoading]               = useState(true)
  const [saving,  setSaving]                = useState(false)
  const [success, setSuccess]               = useState(false)

  const getTodayStr = () => {
    const d = new Date()
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  }

  useEffect(() => { fetchData() }, [user.userId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resRes, rentRes] = await Promise.all([
        reservationService.getPendingPickups(user.userId),
        rentalService.getByDriver(user.userId),
      ])
      const allPending = resRes.data.data || []
      const todayStr = getTodayStr()
      // Only today's (or overdue/missed) pickups can be started right now — future-dated
      // bookings just show as "Upcoming" so the driver doesn't start a trip early.
      setTodaysTrips(allPending.filter(t => t.pickupDate <= todayStr))
      setFutureTrips(allPending.filter(t => t.pickupDate > todayStr))
      setOngoingTrips((rentRes.data.data || []).filter(r => r.rentalStatus === 'ACTIVE'))
    } catch { } finally { setLoading(false) }
  }

  // ── Start Trip (pickup the customer) ──────────────────────────
  const onPickup = async (data) => {
    if (!selectedTrip) { toast.error('Select a trip first.'); return }
    setSaving(true)
    try {
      const res = await rentalService.pickup({
        reservationId:        selectedTrip.reservationId,
        driverId:             user.userId,
        odometerAtPickup:     Number(data.odometerAtPickup),
        actualPickupDatetime: new Date().toISOString(),
        remarks:              data.remarks || null,
      })
      if (res.data.success) {
        setSuccess({ type: 'pickup', data: res.data.data })
        reset(); setSelectedTrip(null); fetchData()
      } else { toast.error(res.data.message || 'Failed.') }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start the trip.')
    } finally { setSaving(false) }
  }

  // ── End Trip (drop the customer, close the fare) ───────────────
  const onDrop = async (data) => {
    if (!selectedOngoing) { toast.error('Select an ongoing trip first.'); return }
    setSaving(true)
    try {
      const res = await rentalService.returnCar(selectedOngoing.rentalId, {
        odometerAtReturn:     Number(data.odometerAtReturn),
        actualReturnDatetime: new Date().toISOString(),
        damageCharges:        data.damageCharges ? Number(data.damageCharges) : 0,
        discountAmount:       data.discountAmount ? Number(data.discountAmount) : 0,
        remarks:              data.remarks || null,
      })
      if (res.data.success) {
        setSuccess({ type: 'drop', data: res.data.data })
        reset(); setSelectedOngoing(null); fetchData()
      } else { toast.error(res.data.message || 'Failed.') }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not close the trip.')
    } finally { setSaving(false) }
  }

  const resetSuccess = () => { setSuccess(false); reset() }

  // ── Success Screen ──────────────────────────────────────
  if (success) return (
    <DriverLayout>
      <div className="max-w-md mx-auto text-center py-16 animate-fade-in">
        <div className="text-7xl mb-5">
          {success.type === 'pickup' ? '🧭' : '✅'}
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {success.type === 'pickup' ? 'Trip Started!' : 'Trip Completed!'}
        </h2>
        <p className="text-gray-500 mb-6">
          {success.type === 'pickup'
            ? 'You have picked up the customer. Drive safe!'
            : 'Customer dropped off. Fare has been calculated and synced to their account.'}
        </p>
        <div className="card text-left space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Customer</span>
            <span className="font-semibold">{success.data.customerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Car</span>
            <span className="font-semibold">{success.data.carBrand} {success.data.carModel}</span>
          </div>
          {success.type === 'drop' && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total KM Driven</span>
                <span className="font-semibold">{success.data.totalKmDriven} km</span>
              </div>
              {success.data.extraKmCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Extra KM Charges</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(success.data.extraKmCharges)}</span>
                </div>
              )}
              {success.data.lateReturnCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Late Return Charges</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(success.data.lateReturnCharges)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Final Amount</span>
                <span className="font-bold text-sky-600">{formatCurrency(success.data.totalAmount)}</span>
              </div>
            </>
          )}
        </div>
        <button onClick={resetSuccess} className="btn-primary px-8 py-2.5">
          {success.type === 'pickup' ? 'Back to Trips' : 'Process Another'}
        </button>
      </div>
    </DriverLayout>
  )

  return (
    <DriverLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="page-title">Pickup & Drop-off</h2>
          <p className="text-gray-500 text-sm">Pick up your assigned customer, drive them, then close out the trip on drop-off.</p>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {[
            { key: 'pickup', label: 'Pickup Customer', icon: FiMapPin       },
            { key: 'drop',   label: 'Drop-off & Close', icon: FiCornerUpLeft },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setMode(key)}
              className={'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ' +
                (mode === key ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* ── PICKUP MODE ── */}
        {mode === 'pickup' && (
          <div className="space-y-5">
            <div className="card">
              <h3 className="section-title flex items-center gap-2">
                <FiMapPin className="text-sky-500" /> Today's Trips — Ready to Pick Up
              </h3>
              {loading ? (
                <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              ) : todaysTrips.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                  <p className="text-yellow-700 text-sm">No trips scheduled for pickup today.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todaysTrips.map(t => (
                    <button key={t.reservationId} type="button"
                      onClick={() => setSelectedTrip(t)}
                      className={'w-full text-left p-4 rounded-xl border-2 transition-all ' +
                        (selectedTrip?.reservationId === t.reservationId
                          ? 'border-sky-500 bg-sky-50'
                          : 'border-gray-100 hover:border-gray-200')}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                            <FiUser size={13} className="text-gray-400" /> {t.customerName}
                          </p>
                          <p className="text-gray-400 text-xs mt-0.5">{t.carBrand} {t.carModel} • {formatDate(t.pickupDate)} at {t.pickupTime}</p>
                        </div>
                        {selectedTrip?.reservationId === t.reservationId && <FiCheckCircle className="text-sky-500 flex-shrink-0" size={18} />}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                        <FiNavigation size={12} className="text-green-500 flex-shrink-0" />
                        <span className="font-medium">Pickup:</span> {t.pickupLocation}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <FiNavigation size={12} className="text-red-500 flex-shrink-0" />
                        <span className="font-medium">Drop:</span> {t.dropLocation}
                      </div>
                      {t.customerMobile && (
                        <a href={'tel:' + t.customerMobile} onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs text-sky-600 font-semibold mt-2 hover:underline">
                          <FiPhone size={12} /> {t.customerMobile}
                        </a>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming (future-dated) bookings — visible but not startable yet */}
            {!loading && futureTrips.length > 0 && (
              <div className="card">
                <h3 className="section-title flex items-center gap-2 text-gray-500">
                  <FiClock className="text-gray-400" /> Upcoming Bookings
                </h3>
                <p className="text-gray-400 text-xs -mt-2 mb-3">
                  Assigned to you but scheduled for a future date — you can start these on their pickup date.
                </p>
                <div className="space-y-2">
                  {futureTrips.map(t => (
                    <div key={t.reservationId}
                      className="p-3 rounded-xl border border-gray-100 bg-gray-50 opacity-80">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-700 text-sm">{t.customerName}</p>
                          <p className="text-gray-400 text-xs">{t.carBrand} {t.carModel} • {t.pickupLocation} → {t.dropLocation}</p>
                        </div>
                        <span className="badge-warning whitespace-nowrap">{formatDate(t.pickupDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTrip && (
              <form onSubmit={handleSubmit(onPickup)} className="card space-y-5">
                <h3 className="section-title">Confirm Pickup</h3>
                <p className="text-gray-500 text-sm -mt-3">
                  Go to <strong>{selectedTrip.pickupLocation}</strong>, meet {selectedTrip.customerName}, and confirm
                  the trip details with them before starting.
                </p>
                <div>
                  <label className="form-label">Odometer Reading Now (km) *</label>
                  <input type="number" {...register('odometerAtPickup', {
                    required: 'Required', min: { value: 0, message: 'Cannot be negative' },
                  })}
                    className="form-input" placeholder="e.g. 15000" />
                  {errors.odometerAtPickup && <p className="form-error">{errors.odometerAtPickup.message}</p>}
                </div>
                <div>
                  <label className="form-label">Pickup Remarks</label>
                  <textarea {...register('remarks')} rows={2} className="form-input resize-none"
                    placeholder="Car condition, fuel level, scratches, etc." />
                </div>
                <button type="submit" disabled={saving}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                  <FiSave size={16} /> {saving ? 'Starting...' : 'Confirm Pickup & Start Trip'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── DROP-OFF MODE ── */}
        {mode === 'drop' && (
          <div className="space-y-5">
            <div className="card">
              <h3 className="section-title flex items-center gap-2">
                <FiCornerUpLeft className="text-sky-500" /> Select Your Ongoing Trip
              </h3>
              {loading ? (
                <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              ) : ongoingTrips.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                  <p className="text-yellow-700 text-sm">No ongoing trips right now.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ongoingTrips.map(t => (
                    <button key={t.rentalId} type="button"
                      onClick={() => setSelectedOngoing(t)}
                      className={'w-full text-left p-4 rounded-xl border-2 transition-all ' +
                        (selectedOngoing?.rentalId === t.rentalId
                          ? 'border-sky-500 bg-sky-50'
                          : 'border-gray-100 hover:border-gray-200')}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{t.carBrand} {t.carModel}</p>
                          <p className="text-gray-400 text-xs mt-0.5">
                            {t.customerName} • Started at {t.odometerAtPickup} km
                          </p>
                          {t.dropLocation && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <FiNavigation size={11} className="text-red-500" /> Heading to: {t.dropLocation}
                            </p>
                          )}
                        </div>
                        {selectedOngoing?.rentalId === t.rentalId && <FiCheckCircle className="text-sky-500 flex-shrink-0" size={18} />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedOngoing && (
              <form onSubmit={handleSubmit(onDrop)} className="card space-y-5">
                <h3 className="section-title">Close Out the Trip</h3>
                <p className="text-gray-500 text-sm -mt-3">
                  Enter the final odometer reading — this calculates the fare and updates the customer's balance due automatically.
                </p>
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  ⏰ The car is due back by {selectedOngoing.pickupTime} on the return date. Returning
                  later than that adds ₹200 per hour (or part-hour) late.
                </p>
                {selectedOngoing.tripType === 'LOCAL' && (
                  <p className="text-xs bg-blue-50 text-blue-600 rounded-lg px-3 py-2 -mt-2">
                    ℹ️ Local package includes 200 km per day booked (e.g. 400 km for a 2-day booking). Beyond that, ₹20 is added per extra km driven.
                  </p>
                )}
                <div>
                  <label className="form-label">
                    Odometer Reading Now (km) — min {selectedOngoing.odometerAtPickup} *
                  </label>
                  <input type="number" {...register('odometerAtReturn', {
                    required: 'Required',
                    min: { value: selectedOngoing.odometerAtPickup, message: 'Must be at least ' + selectedOngoing.odometerAtPickup + ' km (pickup reading)' },
                  })} className="form-input" placeholder={'Min: ' + selectedOngoing.odometerAtPickup} />
                  {errors.odometerAtReturn && <p className="form-error">{errors.odometerAtReturn.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Damage Charges (₹)</label>
                    <input type="number" {...register('damageCharges')} className="form-input" placeholder="0" min={0} />
                  </div>
                  <div>
                    <label className="form-label">Discount (₹)</label>
                    <input type="number" {...register('discountAmount')} className="form-input" placeholder="0" min={0} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Drop-off Remarks</label>
                  <textarea {...register('remarks')} rows={2} className="form-input resize-none"
                    placeholder="Car condition at drop-off, any new damage..." />
                </div>
                <button type="submit" disabled={saving}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                  <FiSave size={16} /> {saving ? 'Closing...' : 'Confirm Drop-off & Calculate Fare'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </DriverLayout>
  )
}
