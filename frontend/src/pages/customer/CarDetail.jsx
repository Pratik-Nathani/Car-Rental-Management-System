import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { carService, reservationService, feedbackService } from '../../services/allServices'
import CustomerLayout from '../../components/layout/CustomerLayout'
import { formatCurrency, toLocalDateStr, getFileUrl } from '../../utils/helpers'
import { FiArrowLeft, FiUsers, FiZap, FiTool, FiCalendar, FiMapPin, FiCheck, FiStar } from 'react-icons/fi'

export default function CarDetail() {
  const { carId } = useParams()
  const navigate  = useNavigate()
  const [car, setCar]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [bookedRanges, setBookedRanges] = useState([])
  const [reviews, setReviews] = useState([])
  const [tripType, setTripType] = useState('LOCAL')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date(); d.setDate(1); return d
  })

  useEffect(() => {
    carService.getById(carId)
      .then(res => setCar(res.data.data))
      .catch(() => setCar(null))
      .finally(() => setLoading(false))

    reservationService.getAvailability(carId)
      .then(res => setBookedRanges(res.data.data || []))
      .catch(() => setBookedRanges([]))

    feedbackService.getForCar(carId)
      .then(res => setReviews(res.data.data || []))
      .catch(() => setReviews([]))
  }, [carId])

  const today = toLocalDateStr(new Date())

  // Is this specific date (yyyy-mm-dd) inside any booked range?
  const isDateBooked = (dateStr) => {
    const d = new Date(dateStr)
    return bookedRanges.some(b => d >= new Date(b.pickupDate) && d <= new Date(b.returnDate))
  }

  // Build the visible calendar grid: leading blanks + all days of the month
  const buildCalendarDays = (monthDate) => {
    const year = monthDate.getFullYear(), month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const leadingBlanks = firstDay.getDay() // 0=Sun
    const days = Array(leadingBlanks).fill(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))
    return days
  }
  const calendarDays = buildCalendarDays(calendarMonth)
  const changeMonth = (delta) => {
    setCalendarMonth(prev => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() + delta)
      return next
    })
  }
  const isPast = (date) => {
    const d0 = new Date(); d0.setHours(0,0,0,0)
    return date < d0
  }

  if (loading) return (
    <CustomerLayout>
      <div className="animate-pulse space-y-4">
        <div className="h-72 bg-gray-200 rounded-2xl" />
        <div className="h-8 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
      </div>
    </CustomerLayout>
  )

  if (!car) return (
    <CustomerLayout>
      <div className="text-center py-20">
        <p className="text-5xl mb-4">❌</p>
        <p className="text-xl font-bold text-gray-700 mb-2">Car not found</p>
        <Link to="/customer/cars" className="btn-primary mt-4 inline-block">Back to Cars</Link>
      </div>
    </CustomerLayout>
  )

  const specs = [
    { icon: FiUsers,    label: 'Seating',      value: car.seatingCapacity + ' Persons'           },
    { icon: FiZap,      label: 'Fuel Type',     value: car.fuelType                               },
    { icon: FiTool,     label: 'Transmission',  value: car.transmissionType                       },
    { icon: FiZap,      label: 'Mileage',       value: car.mileageKmpl ? car.mileageKmpl + ' km/l' : 'N/A' },
    { icon: FiCalendar, label: 'Year',          value: car.year                                   },
    { icon: FiMapPin,   label: 'Category',      value: car.carCategory?.replace('_', ' ')         },
  ]

  const features = [
    'Air Conditioning', 'Power Steering', 'Power Windows',
    'Central Locking', 'Music System', 'GPS Navigation',
    '24/7 Roadside Assistance', 'Insurance Included',
  ]

  const isAvailable = car.availabilityStatus === 'AVAILABLE'

  return (
    <CustomerLayout>
      {/* Back */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium">
          <FiArrowLeft /> Back to Cars
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Left: Car Info ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Car Image */}
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden h-72 relative">
            {car.imageUrl ? (
              <img src={getFileUrl(car.imageUrl)} alt={car.brand + ' ' + car.model}
                className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-8xl opacity-20">🚗</span>
              </div>
            )}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="bg-white text-gray-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                {car.fuelType}
              </span>
              <span className="bg-white text-gray-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                {car.transmissionType}
              </span>
            </div>
            <div className="absolute top-4 right-4">
              {isAvailable ? (
                <span className="badge-success">✓ Available</span>
              ) : (
                <span className="badge-danger">Unavailable</span>
              )}
            </div>
          </div>

          {/* Car Name & Description */}
          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{car.brand} {car.model}</h1>
                <p className="text-gray-400 text-sm mt-0.5">
                  {car.year} • {car.carCategory?.replace('_',' ')} • {car.color}
                </p>
                <p className="text-xs text-gray-400 mt-1">Reg: {car.registrationNumber}</p>
                {reviews.length > 0 ? (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="flex items-center gap-0.5 bg-yellow-50 px-2 py-1 rounded-lg">
                      <FiStar className="text-yellow-500" size={13} />
                      <span className="text-sm font-bold text-gray-800">
                        {(reviews.reduce((sum, r) => sum + r.averageRating, 0) / reviews.length).toFixed(1)}
                      </span>
                    </div>
                    <span className="text-gray-400 text-xs">{reviews.length} review{reviews.length > 1 ? 's' : ''}</span>
                  </div>
                ) : (
                  <p className="text-gray-300 text-xs mt-2">No reviews yet</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-orange-500">{formatCurrency(car.rentPerDay)}</p>
                <p className="text-gray-400 text-sm">per day (local)</p>
              </div>
            </div>
            {car.description && (
              <p className="text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3 mt-3">
                {car.description}
              </p>
            )}
          </div>

          {/* Specs */}
          <div className="card">
            <h3 className="section-title">🔧 Specifications</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {specs.map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Icon className="text-orange-500" size={15} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">{label}</p>
                    <p className="text-gray-700 text-sm font-semibold">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="card">
            <h3 className="section-title">✨ Features & Amenities</h3>
            <div className="grid grid-cols-2 gap-2">
              {features.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <FiCheck className="text-green-500 flex-shrink-0" size={14} />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Customer Reviews */}
          <div className="card">
            <h3 className="section-title">⭐ Customer Reviews {reviews.length > 0 && `(${reviews.length})`}</h3>
            {reviews.length === 0 ? (
              <p className="text-gray-400 text-sm">No reviews yet for this car — be the first to book and review it!</p>
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 5).map(r => (
                  <div key={r.feedbackId} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-700 text-sm">{r.customerName}</p>
                      <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-lg">
                        <FiStar className="text-yellow-500" size={11} />
                        <span className="text-xs font-bold text-gray-700">{r.averageRating}</span>
                      </div>
                    </div>
                    {r.comments && <p className="text-gray-500 text-xs whitespace-pre-line">{r.comments}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Booking Card ── */}
        <div className="space-y-4">
          <div className="card sticky top-24">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Book This Car</h3>

            {/* Pricing Comparison: Local vs Outstation */}
            <div className="space-y-3 mb-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">🏙️ Local (in-city)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-800">{formatCurrency(car.rentPerDay)}</span>
                  <span className="text-gray-500 text-sm">/ day</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">Flat package — stay within your home city/district</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">🛣️ Outstation</p>
                {car.ratePerKm ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-gray-800">{formatCurrency(car.ratePerKm)}</span>
                      <span className="text-gray-500 text-sm">/ km (round trip)</span>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">
                      + {formatCurrency(car.nightChargePerNight || 300)}/night for multi-day trips
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">Not available for this car</p>
                )}
              </div>
              <p className="text-gray-400 text-xs text-center">Exact price shown at booking based on your route & dates</p>
            </div>

            {/* Trip Type — carried forward to the booking page */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">I want to:</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setTripType('LOCAL')}
                  className={'p-2.5 rounded-lg border-2 text-xs font-medium transition-all ' +
                    (tripType === 'LOCAL' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-600')}>
                  🏙️ Stay in Patna
                </button>
                <button type="button" onClick={() => setTripType('OUTSTATION')}
                  className={'p-2.5 rounded-lg border-2 text-xs font-medium transition-all ' +
                    (tripType === 'OUTSTATION' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-600')}>
                  🛣️ Go Outstation
                </button>
              </div>
            </div>

            {/* Availability Calendar */}
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                  <FiCalendar size={12} /> Availability
                </p>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => changeMonth(-1)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 text-sm">
                    ‹
                  </button>
                  <span className="text-xs font-semibold text-gray-700 w-20 text-center">
                    {calendarMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                  <button type="button" onClick={() => changeMonth(1)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 text-sm">
                    ›
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold text-gray-400">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, i) => {
                  if (!date) return <div key={i} />
                  const dateStr = toLocalDateStr(date)
                  const past = isPast(date)
                  const booked = !past && isDateBooked(dateStr)
                  return (
                    <div key={i}
                      title={past ? 'Past date' : booked ? 'Booked' : 'Available'}
                      className={'aspect-square flex items-center justify-center rounded-md text-[11px] font-semibold ' +
                        (past ? 'text-gray-300' :
                         booked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700')}>
                      {date.getDate()}
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-300"></span> Available
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-300"></span> Booked
                </div>
              </div>
            </div>

            {isAvailable ? (
              <button onClick={() => navigate('/customer/booking/' + car.carId + '?tripType=' + tripType)}
                className="btn-primary w-full py-3 text-base">
                🚗 Book Now
              </button>
            ) : (
              <button disabled className="w-full py-3 bg-gray-200 text-gray-400
                                          rounded-xl font-semibold cursor-not-allowed">
                Not Available
              </button>
            )}

            <Link to="/customer/cars"
              className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-3 transition-colors">
              ← Browse other cars
            </Link>

            {/* Info */}
            <div className="mt-4 space-y-2">
              {['Free cancellation up to 12 hours before pickup',
                'Cancelling within 12 hours deducts a ₹500 fee',
                'Pay in full, or a min. ₹1000 deposit to confirm',
                'Roadside assistance 24/7'].map(info => (
                <div key={info} className="flex items-start gap-2 text-xs text-gray-500">
                  <FiCheck className="text-green-500 mt-0.5 flex-shrink-0" size={12} />
                  {info}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  )
}
