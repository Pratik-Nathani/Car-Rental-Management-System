import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { carService, feedbackService } from '../../services/allServices'
import { useLanguage } from '../../context/LanguageContext'
import CustomerLayout from '../../components/layout/CustomerLayout'
import { formatCurrency, toLocalDateStr, getFileUrl } from '../../utils/helpers'
import { CAR_CATEGORIES, FUEL_TYPES, TRANSMISSION_TYPES } from '../../utils/constants'
import { FiSearch, FiFilter, FiUsers, FiZap, FiX, FiStar, FiBarChart2, FiCheck } from 'react-icons/fi'

export default function BrowseCars() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [cars, setCars]         = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showFilter, setShowFilter] = useState(false)
  const [ratings, setRatings] = useState({}) // { carId: { averageRating, totalReviews } }
  const [compareIds, setCompareIds] = useState([])
  const [showCompare, setShowCompare] = useState(false)

  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('')
  const [fuel,     setFuel]     = useState('')
  const [trans,    setTrans]     = useState('')
  const [maxRent,  setMaxRent]  = useState('')
  const [seats,    setSeats]    = useState('')
  const [pickup,   setPickup]   = useState('')
  const [returnD,  setReturnD]  = useState('')

  useEffect(() => {
    fetchCars()
    feedbackService.getAllRatings()
      .then(res => setRatings(res.data.data || {}))
      .catch(() => setRatings({}))
  }, [])

  const toggleCompare = (e, carId) => {
    e.stopPropagation()
    setCompareIds(prev => {
      if (prev.includes(carId)) return prev.filter(id => id !== carId)
      if (prev.length >= 3) { toast.error('You can compare up to 3 cars at a time.'); return prev }
      return [...prev, carId]
    })
  }

  const fetchCars = async () => {
    setLoading(true)
    try {
      const res = await carService.getAvailable()
      setCars(res.data.data || [])
      setFiltered(res.data.data || [])
    } catch {
      setCars([]); setFiltered([])
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let result = [...cars]
    if (search)   result = result.filter(c => (c.brand + ' ' + c.model).toLowerCase().includes(search.toLowerCase()))
    if (category) result = result.filter(c => c.carCategory === category)
    if (fuel)     result = result.filter(c => c.fuelType === fuel)
    if (trans)    result = result.filter(c => c.transmissionType === trans)
    if (maxRent)  result = result.filter(c => c.rentPerDay <= Number(maxRent))
    if (seats)    result = result.filter(c => c.seatingCapacity >= Number(seats))
    setFiltered(result)
  }

  useEffect(() => { applyFilters() }, [search, category, fuel, trans, maxRent, seats, cars])

  const searchByDate = async () => {
    if (!pickup || !returnD) return
    setLoading(true)
    try {
      const res = await carService.getAvailableBetween(pickup, returnD)
      setCars(res.data.data || [])
      setFiltered(res.data.data || [])
    } catch { } finally { setLoading(false) }
  }

  const clearFilters = () => {
    setSearch(''); setCategory(''); setFuel('')
    setTrans(''); setMaxRent(''); setSeats('')
    setPickup(''); setReturnD('')
    fetchCars()
  }

  const fuelColors = { PETROL:'bg-blue-50 text-blue-600', DIESEL:'bg-gray-50 text-gray-600',
    CNG:'bg-green-50 text-green-600', ELECTRIC:'bg-emerald-50 text-emerald-600', HYBRID:'bg-teal-50 text-teal-600' }

  return (
    <CustomerLayout>
      <div className="page-title mb-6">{t('browseCars')}</div>

      {/* Search + Date Filter Bar */}
      <div className="card mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="form-label">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-3.5 text-gray-400 text-sm" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="form-input pl-9" placeholder="Search brand or model..." />
            </div>
          </div>
          <div>
            <label className="form-label">Pickup Date</label>
            <input type="date" value={pickup} onChange={e => setPickup(e.target.value)}
              className="form-input" min={toLocalDateStr(new Date())} />
          </div>
          <div>
            <label className="form-label">Return Date</label>
            <input type="date" value={returnD} onChange={e => setReturnD(e.target.value)}
              className="form-input" min={pickup || toLocalDateStr(new Date())} />
          </div>
          <button onClick={searchByDate} className="btn-primary py-3 px-5">Search</button>
          <button onClick={() => setShowFilter(!showFilter)}
            className="btn-gray flex items-center gap-2 py-3 px-4">
            <FiFilter size={15} /> Filters
          </button>
          <button onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500 transition-colors">
            <FiX size={14} /> Clear
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilter && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div>
              <label className="form-label">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="form-select">
                <option value="">All Categories</option>
                {CAR_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Fuel Type</label>
              <select value={fuel} onChange={e => setFuel(e.target.value)} className="form-select">
                <option value="">All Fuels</option>
                {FUEL_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Transmission</label>
              <select value={trans} onChange={e => setTrans(e.target.value)} className="form-select">
                <option value="">All</option>
                {TRANSMISSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Max Rent/Day (₹)</label>
              <input type="number" value={maxRent} onChange={e => setMaxRent(e.target.value)}
                className="form-input" placeholder="e.g. 3000" />
            </div>
            <div>
              <label className="form-label">Min Seats</label>
              <select value={seats} onChange={e => setSeats(e.target.value)} className="form-select">
                <option value="">Any</option>
                {[2,4,5,6,7,8,12].map(n => <option key={n} value={n}>{n}+ seats</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <p className="text-gray-500 text-sm mb-4">
        Showing <strong className="text-gray-800">{filtered.length}</strong> available cars
      </p>

      {/* Cars Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
              <div className="h-44 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-8 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🚗</p>
          <p className="text-xl font-bold text-gray-700 mb-2">No cars found</p>
          <p className="text-gray-400 text-sm">Try adjusting your filters</p>
          <button onClick={clearFilters} className="btn-primary mt-4">Clear Filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(car => (
            <div key={car.carId}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg
                         transition-all duration-300 border border-gray-100 group">
              {/* Car Image */}
              <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {car.imageUrl ? (
                  <img src={getFileUrl(car.imageUrl)} alt={car.brand + ' ' + car.model}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl opacity-20">🚗</span>
                  </div>
                )}
                {/* Compare checkbox — sits well below the transmission badge so they never overlap */}
                <button onClick={e => toggleCompare(e, car.carId)}
                  className={'absolute top-16 right-3 flex items-center gap-1 px-2.5 h-7 rounded-full transition-all text-xs font-semibold shadow-sm ' +
                    (compareIds.includes(car.carId) ? 'bg-blue-500 text-white' : 'bg-white/90 text-gray-500 hover:text-blue-500')}
                  title="Add to comparison">
                  {compareIds.includes(car.carId) ? <FiCheck size={13} /> : <FiBarChart2 size={13} />}
                  Compare
                </button>
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' +
                    (fuelColors[car.fuelType] || 'bg-gray-100 text-gray-600')}>
                    {car.fuelType}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="bg-white text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {car.transmissionType}
                  </span>
                </div>
              </div>

              {/* Car Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">{car.brand} {car.model}</h3>
                    <p className="text-gray-400 text-xs">{car.year} • {car.carCategory?.replace('_', ' ')}</p>
                    {ratings[car.carId] ? (
                      <div className="flex items-center gap-1 mt-1">
                        <FiStar className="text-yellow-400" size={12} />
                        <span className="text-xs font-semibold text-gray-700">{ratings[car.carId].averageRating}</span>
                        <span className="text-xs text-gray-400">({ratings[car.carId].totalReviews})</span>
                      </div>
                    ) : (
                      <p className="text-gray-300 text-xs mt-1">No reviews yet</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-orange-500 font-bold text-lg">{formatCurrency(car.rentPerDay)}</p>
                    <p className="text-gray-400 text-xs">per day (local)</p>
                    {car.ratePerKm ? (
                      <p className="text-blue-500 text-xs font-medium mt-0.5">
                        {formatCurrency(car.ratePerKm)}/km outstation
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Specs */}
                <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <FiUsers size={12} /> {car.seatingCapacity} seats
                  </span>
                  {car.mileageKmpl && (
                    <span className="flex items-center gap-1">
                      <FiZap size={12} /> {car.mileageKmpl} km/l
                    </span>
                  )}
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-400">{car.color}</span>
                </div>

                <button onClick={() => navigate('/customer/cars/' + car.carId)}
                  className="btn-primary w-full py-2.5 text-sm">
                  {t('viewAndBook')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Compare Bar */}
      {compareIds.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white
                         rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{compareIds.length} car{compareIds.length > 1 ? 's' : ''} selected</span>
          <button onClick={() => setShowCompare(true)}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 px-4 py-1.5 rounded-xl text-sm font-semibold">
            <FiBarChart2 size={14} /> Compare
          </button>
          <button onClick={() => setCompareIds([])} className="text-gray-400 hover:text-white"><FiX size={16} /></button>
        </div>
      )}

      {/* Comparison Modal */}
      {showCompare && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
             onClick={() => setShowCompare(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FiBarChart2 className="text-orange-500" /> Compare Cars
              </h3>
              <button onClick={() => setShowCompare(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {[
                    { label: '', render: c => (
                        <div className="text-center">
                          <div className="w-full h-24 bg-gray-100 rounded-xl flex items-center justify-center mb-2 overflow-hidden">
                            {c.imageUrl ? <img src={c.imageUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-3xl opacity-30">🚗</span>}
                          </div>
                          <p className="font-bold text-gray-800">{c.brand} {c.model}</p>
                        </div>
                      ) },
                    { label: 'Category', render: c => c.carCategory?.replace('_', ' ') },
                    { label: 'Year', render: c => c.year },
                    { label: 'Seats', render: c => c.seatingCapacity },
                    { label: 'Fuel Type', render: c => c.fuelType },
                    { label: 'Transmission', render: c => c.transmissionType },
                    { label: 'Mileage', render: c => c.mileageKmpl ? c.mileageKmpl + ' km/l' : '—' },
                    { label: 'Local Rate', render: c => formatCurrency(c.rentPerDay) + '/day' },
                    { label: 'Outstation Rate', render: c => c.ratePerKm ? formatCurrency(c.ratePerKm) + '/km' : '—' },
                    { label: 'Night Charge', render: c => c.nightChargePerNight ? formatCurrency(c.nightChargePerNight) + '/night' : '₹300/night' },
                    { label: 'Rating', render: c => ratings[c.carId]
                        ? '⭐ ' + ratings[c.carId].averageRating + ' (' + ratings[c.carId].totalReviews + ')'
                        : 'No reviews yet' },
                  ].map((row, i) => (
                    <tr key={i} className={i === 0 ? '' : 'border-t border-gray-100'}>
                      {row.label && <td className="py-3 pr-4 text-gray-400 text-xs font-semibold uppercase whitespace-nowrap">{row.label}</td>}
                      {compareIds.map(id => {
                        const c = cars.find(car => car.carId === id)
                        if (!c) return <td key={id} />
                        return (
                          <td key={id} className={'py-3 px-3 text-center ' + (row.label ? 'text-gray-700' : '')}
                              colSpan={row.label ? 1 : 1}>
                            {row.render(c)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr className="border-t border-gray-100">
                    <td className="py-3"></td>
                    {compareIds.map(id => (
                      <td key={id} className="py-3 px-3 text-center">
                        <button onClick={() => { setShowCompare(false); navigate('/customer/cars/' + id) }}
                          className="btn-primary text-xs px-4 py-2">{t('viewAndBook')}</button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  )
}
