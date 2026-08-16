import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/layout/AdminLayout'
import { feedbackService } from '../../services/allServices'
import { FiSearch, FiX } from 'react-icons/fi'

const ASPECTS = [
  { key:'carCondition',   label:'Car Condition'   },
  { key:'staffBehavior',  label:'Staff Behavior'  },
  { key:'valueForMoney',  label:'Value for Money' },
  { key:'bookingProcess', label:'Booking Process' },
]

const RATING_LABELS = ['','Poor','Fair','Good','Very Good','Excellent']
const RATING_COLORS = ['','text-red-500','text-orange-400','text-yellow-500','text-blue-500','text-green-500']

function Stars({ value, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={value >= s ? '#facc15' : 'none'}
            stroke={value >= s ? '#facc15' : '#d1d5db'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  )
}

export default function AdminFeedback() {
  const [feedback,  setFeedback]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('')
  const [selected,  setSelected]  = useState(null)

  useEffect(() => {
    feedbackService.getAll()
      .then(res => {
        const mapped = (res.data.data || []).map(f => ({
          id: f.feedbackId,
          customerName: f.customerName,
          carBrand: f.carLabel,   // backend already returns "Brand Model" as one string
          carModel: '',
          rentalId: f.rentalId,
          overallRating: Math.round(f.overallRating ?? f.averageRating ?? f.overallService),
          carCondition: f.carCondition,
          staffBehavior: f.staffBehavior,
          valueForMoney: f.valueForMoney,
          bookingProcess: f.bookingProcess,
          positives: f.comments || 'No written review provided.',
          improvements: '',
          recommend: (f.overallService >= 4) ? 'YES' : (f.overallService === 3) ? 'MAYBE' : 'NO',
          createdAt: f.createdAt ? f.createdAt.split('T')[0] : '',
        }))
        setFeedback(mapped)
      })
      .catch(() => toast.error('Failed to load feedback.'))
      .finally(() => setLoading(false))
  }, [])

  // Summary stats
  const avgRating  = feedback.length
    ? (feedback.reduce((s, f) => s + f.overallRating, 0) / feedback.length).toFixed(1)
    : 0
  const recommend  = feedback.filter(f => f.recommend === 'YES').length
  const dist       = [5,4,3,2,1].map(r => ({
    rating: r,
    count:  feedback.filter(f => f.overallRating === r).length,
    pct:    feedback.length ? Math.round(feedback.filter(f => f.overallRating === r).length / feedback.length * 100) : 0,
  }))

  const filtered = feedback.filter(f => {
    const matchSearch = !search ||
      f.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (f.carBrand + ' ' + f.carModel).toLowerCase().includes(search.toLowerCase())
    const matchFilter = !filter || String(f.overallRating) === filter
    return matchSearch && matchFilter
  })

  const recommendColors = { YES:'badge-success', MAYBE:'badge-warning', NO:'badge-danger' }
  const recommendLabels = { YES:'👍 Yes', MAYBE:'🤔 Maybe', NO:'👎 No' }

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="page-title">Customer Feedback</h2>
        <p className="text-gray-500 text-sm">{feedback.length} total reviews</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-4xl font-bold text-yellow-400 mb-1">{avgRating}</p>
          <Stars value={Math.round(avgRating)} size={18} />
          <p className="text-gray-500 text-xs mt-2">Average Rating</p>
        </div>
        <div className="card text-center">
          <p className="text-4xl font-bold text-green-500 mb-1">{recommend}</p>
          <p className="text-gray-500 text-sm">Would Recommend</p>
          <p className="text-gray-400 text-xs mt-1">
            {feedback.length ? Math.round(recommend / feedback.length * 100) : 0}% of customers
          </p>
        </div>
        <div className="card col-span-2">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Rating Distribution</p>
          <div className="space-y-1.5">
            {dist.map(({ rating, count, pct }) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-4">{rating}</span>
                <svg width={12} height={12} viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill="#facc15" stroke="#facc15" strokeWidth="2" />
                </svg>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: pct + '%' }} />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Aspect Averages */}
      <div className="card mb-6">
        <h3 className="section-title">📊 Average Ratings by Aspect</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ASPECTS.map(({ key, label }) => {
            const avg = feedback.length
              ? (feedback.reduce((s, f) => s + (f[key] || 0), 0) / feedback.length).toFixed(1)
              : 0
            return (
              <div key={key} className="text-center p-3 bg-gray-50 rounded-xl">
                <p className={'text-2xl font-bold mb-1 ' + RATING_COLORS[Math.round(avg)]}>{avg}</p>
                <Stars value={Math.round(avg)} size={13} />
                <p className="text-gray-500 text-xs mt-1.5">{label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-3.5 text-gray-400 text-sm" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="form-input pl-9" placeholder="Search customer or car..." />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="form-select w-40">
          <option value="">All Ratings</option>
          {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Stars</option>)}
        </select>
        {(search || filter) && (
          <button onClick={() => { setSearch(''); setFilter('') }}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500">
            <FiX size={14} /> Clear
          </button>
        )}
      </div>

      {/* Feedback Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-4xl mb-3">⭐</p>
          <p className="font-bold text-gray-700">No feedback found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(f => (
            <div key={f.id}
              className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer"
              onClick={() => setSelected(f)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center
                                  text-orange-600 font-bold text-base flex-shrink-0">
                    {f.customerName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <p className="font-bold text-gray-800">{f.customerName}</p>
                      <span className="text-gray-300">|</span>
                      <p className="text-gray-500 text-sm">{f.carBrand} {f.carModel}</p>
                      <span className={recommendColors[f.recommend] + ' text-xs'}>
                        {recommendLabels[f.recommend]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Stars value={f.overallRating} size={15} />
                      <span className={'text-sm font-semibold ' + RATING_COLORS[f.overallRating]}>
                        {RATING_LABELS[f.overallRating]}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                      "{f.positives}"
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-400 text-xs">{f.createdAt}</p>
                  <p className="text-gray-400 text-xs mt-1">Rental #{f.rentalId}</p>
                </div>
              </div>

              {/* Aspect mini-bars */}
              <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-100">
                {ASPECTS.map(({ key, label }) => (
                  <div key={key} className="text-center">
                    <Stars value={f[key]} size={11} />
                    <p className="text-gray-400 text-xs mt-0.5 truncate">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h3 className="font-bold text-gray-800">Feedback Details</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <FiX size={22} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-xl">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center
                                justify-center text-white font-bold text-lg">
                  {selected.customerName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{selected.customerName}</p>
                  <p className="text-gray-500 text-sm">{selected.carBrand} {selected.carModel} • Rental #{selected.rentalId}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Stars value={selected.overallRating} size={16} />
                    <span className={'font-semibold text-sm ' + RATING_COLORS[selected.overallRating]}>
                      {RATING_LABELS[selected.overallRating]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Aspect Ratings */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Aspect Ratings</p>
                <div className="grid grid-cols-2 gap-3">
                  {ASPECTS.map(({ key, label }) => (
                    <div key={key} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                      <p className="text-sm text-gray-600">{label}</p>
                      <div className="flex items-center gap-1.5">
                        <Stars value={selected[key]} size={13} />
                        <span className={'text-xs font-bold ' + RATING_COLORS[selected[key]]}>
                          {selected[key]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review text */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">What they liked</p>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-gray-700 text-sm">"{selected.positives}"</p>
                </div>
              </div>

              {selected.improvements && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Improvements suggested</p>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                    <p className="text-gray-700 text-sm">"{selected.improvements}"</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Recommend:</span>
                  <span className={recommendColors[selected.recommend]}>
                    {recommendLabels[selected.recommend]}
                  </span>
                </div>
                <p className="text-gray-400 text-xs">{selected.createdAt}</p>
              </div>

              <button onClick={() => setSelected(null)} className="btn-gray w-full py-2.5">Close</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
