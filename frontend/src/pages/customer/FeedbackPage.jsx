import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { rentalService, feedbackService } from '../../services/allServices'
import { useAuth } from '../../context/AuthContext'
import CustomerLayout from '../../components/layout/CustomerLayout'
import { formatDate, formatCurrency } from '../../utils/helpers'
import { FiArrowLeft, FiSend } from 'react-icons/fi'

// ── Star Rating Component ────────────────────────────────
function StarRating({ value, onChange, size = 26 }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className="transition-colors duration-150"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={(hovered || value) >= star ? '#facc15' : 'none'}
              stroke={(hovered || value) >= star ? '#facc15' : '#d1d5db'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  )
}

// ── Rating Labels & Colors ───────────────────────────────
const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
const RATING_COLORS = [
  '', 'text-red-500', 'text-orange-400',
  'text-yellow-500', 'text-blue-500', 'text-green-500',
]
const RATING_EMOJI = ['', '😞', '😐', '🙂', '😊', '🤩']

// ── Aspects to rate ──────────────────────────────────────
const ASPECTS = [
  { key: 'carCondition',   label: 'Car Condition',    icon: '🚗', desc: 'Cleanliness & condition of the vehicle'  },
  { key: 'staffBehavior',  label: 'Staff Behavior',   icon: '👤', desc: 'Helpfulness and professionalism of staff' },
  { key: 'valueForMoney',  label: 'Value for Money',  icon: '💰', desc: 'Price vs quality of service'             },
  { key: 'bookingProcess', label: 'Booking Process',  icon: '📱', desc: 'Ease of booking and documentation'       },
  { key: 'overallService', label: 'Overall Service',  icon: '⭐', desc: 'Your overall rental experience'          },
]

export default function FeedbackPage() {
  const { rentalId } = useParams()
  const navigate     = useNavigate()
  const { user }      = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const [rental,     setRental]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const [ratings, setRatings] = useState({
    carCondition:   0,
    staffBehavior:  0,
    valueForMoney:  0,
    bookingProcess: 0,
    overallService: 0,
  })

  useEffect(() => {
    rentalService
      .getById(rentalId)
      .then((res) => setRental(res.data.data))
      .catch(() => toast.error('Rental not found.'))
      .finally(() => setLoading(false))

    feedbackService.existsForRental(rentalId)
      .then((res) => { if (res.data.data) { setSubmitted(true); setAlreadySubmitted(true) } })
      .catch(() => {})
  }, [rentalId])

  // Calculate average rating
  const ratedAspects = Object.values(ratings).filter((v) => v > 0)
  const avgRating =
    ratedAspects.length > 0
      ? Math.round(ratedAspects.reduce((a, b) => a + b, 0) / ratedAspects.length)
      : 0

  const allRated = Object.values(ratings).every((v) => v > 0)

  const setRating = (key, val) =>
    setRatings((prev) => ({ ...prev, [key]: val }))

  const onSubmit = async (data) => {
    if (!allRated) {
      setSubmitAttempted(true)
      toast.error('Please rate all 5 aspects before submitting.')
      return
    }
    setSubmitting(true)
    try {
      const recommendLabel = data.recommend === 'YES' ? 'Would recommend: Yes'
        : data.recommend === 'MAYBE' ? 'Would recommend: Maybe'
        : data.recommend === 'NO' ? 'Would recommend: No' : ''

      const combinedComments = [
        data.positives ? 'Liked: ' + data.positives : '',
        data.improvements ? 'Could improve: ' + data.improvements : '',
        recommendLabel,
        data.comments ? 'Additional: ' + data.comments : '',
      ].filter(Boolean).join('\n')

      await feedbackService.submit(user.userId, {
        rentalId: Number(rentalId),
        carCondition:   ratings.carCondition,
        staffBehavior:  ratings.staffBehavior,
        valueForMoney:  ratings.valueForMoney,
        bookingProcess: ratings.bookingProcess,
        overallService: ratings.overallService,
        comments: combinedComments,
      })
      setSubmitted(true)
      toast.success('Thank you for your feedback! 🙏')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading State ────────────────────────────────────
  if (loading)
    return (
      <CustomerLayout>
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-28 bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
        </div>
      </CustomerLayout>
    )

  // ── Success State ────────────────────────────────────
  if (submitted && alreadySubmitted)
    return (
      <CustomerLayout>
        <div className="max-w-lg mx-auto text-center py-16 animate-fade-in">
          <div className="text-8xl mb-5">🙏</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Already Reviewed</h2>
          <p className="text-gray-500 mb-8 text-lg">
            You've already submitted feedback for this rental. Thanks for sharing your experience!
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => navigate('/customer/bookings')} className="btn-primary px-6 py-2.5">
              My Bookings
            </button>
          </div>
        </div>
      </CustomerLayout>
    )

  if (submitted)
    return (
      <CustomerLayout>
        <div className="max-w-lg mx-auto text-center py-16 animate-fade-in">
          <div className="text-8xl mb-5">{RATING_EMOJI[avgRating] || '🙏'}</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Thank You!</h2>
          <p className="text-gray-500 mb-2 text-lg">Your feedback has been submitted.</p>

          {/* Star display */}
          <div className="flex justify-center gap-1 my-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg key={s} width={32} height={32} viewBox="0 0 24 24">
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill={avgRating >= s ? '#facc15' : 'none'}
                  stroke={avgRating >= s ? '#facc15' : '#d1d5db'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ))}
          </div>

          <p className={RATING_COLORS[avgRating] + ' font-bold text-xl mb-6'}>
            {RATING_LABELS[avgRating]} ({avgRating}/5)
          </p>

          <p className="text-gray-400 text-sm mb-8">
            Your feedback helps us make RentMyRide better for everyone. 🙏
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => navigate('/customer/bookings')}
              className="btn-primary px-6 py-2.5"
            >
              My Bookings
            </button>
            <button
              onClick={() => navigate('/customer/cars')}
              className="btn-outline px-6 py-2.5"
            >
              Book Another Car
            </button>
          </div>
        </div>
      </CustomerLayout>
    )

  // ── Main Form ────────────────────────────────────────
  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800
                     transition-colors text-sm font-medium mb-5"
        >
          <FiArrowLeft /> Back to Bookings
        </button>

        {/* Page title */}
        <div className="mb-6">
          <h2 className="page-title">Rate Your Experience</h2>
          <p className="text-gray-500 text-sm mt-1">
            Your feedback helps us improve our service
          </p>
        </div>

        {/* Rental Summary Card */}
        {rental && (
          <div className="card mb-5 bg-gradient-to-r from-orange-50 to-amber-50
                          border border-orange-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center
                              justify-center text-3xl flex-shrink-0">
                🚗
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-lg">
                  {rental.carBrand} {rental.carModel}
                </h3>
                <p className="text-gray-400 text-xs">{rental.carRegistrationNumber}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                  {rental.actualPickupDatetime && (
                    <span>📅 Pickup: {formatDate(rental.actualPickupDatetime)}</span>
                  )}
                  {rental.actualReturnDatetime && (
                    <span>🏁 Return: {formatDate(rental.actualReturnDatetime)}</span>
                  )}
                  <span>💰 {formatCurrency(rental.totalAmount)}</span>
                </div>
              </div>
              <span className="badge-success hidden sm:inline-flex">Completed</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Live Average Rating Banner */}
          {avgRating > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5
                            text-center animate-fade-in">
              <p className="text-yellow-600 text-xs font-semibold uppercase tracking-wider mb-2">
                Your Average Rating
              </p>
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} width={32} height={32} viewBox="0 0 24 24">
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      fill={avgRating >= s ? '#facc15' : 'none'}
                      stroke={avgRating >= s ? '#facc15' : '#d1d5db'}
                      strokeWidth="2"
                    />
                  </svg>
                ))}
              </div>
              <p className={RATING_COLORS[avgRating] + ' font-bold text-2xl'}>
                {RATING_EMOJI[avgRating]} {RATING_LABELS[avgRating]}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {ratedAspects.length} of {ASPECTS.length} aspects rated
              </p>
            </div>
          )}

          {/* Aspect Ratings */}
          <div className="card">
            <h3 className="section-title">⭐ Rate Each Aspect</h3>
            <p className="text-gray-400 text-xs mb-5">
              Click the stars to rate each aspect of your experience
            </p>
            <div className="space-y-5">
              {ASPECTS.map(({ key, label, icon, desc }) => (
                <div key={key}
                  className={'p-4 rounded-xl border-2 transition-all ' +
                    (ratings[key] > 0
                      ? 'border-yellow-200 bg-yellow-50'
                      : submitAttempted
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-200')}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">{icon}</span>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{label}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                        {ratings[key] > 0 ? (
                          <p className={RATING_COLORS[ratings[key]] + ' text-xs font-semibold mt-1'}>
                            {RATING_EMOJI[ratings[key]]} {RATING_LABELS[ratings[key]]}
                          </p>
                        ) : submitAttempted && (
                          <p className="form-error mt-1">Please rate this aspect</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <StarRating
                        value={ratings[key]}
                        onChange={(val) => { setRating(key, val); }}
                        size={26}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress indicator */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Rating Progress</span>
                <span>{ratedAspects.length}/{ASPECTS.length} completed</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-yellow-400
                             rounded-full transition-all duration-500"
                  style={{ width: (ratedAspects.length / ASPECTS.length * 100) + '%' }}
                />
              </div>
            </div>
          </div>

          {/* Written Review */}
          <div className="card">
            <h3 className="section-title">✍️ Write a Review</h3>
            <div className="space-y-4">

              <div>
                <label className="form-label">What did you like? *</label>
                <textarea
                  {...register('positives', { required: 'Please share what you liked' })}
                  rows={3}
                  className="form-input resize-none"
                  placeholder="e.g. The car was very clean and fuel-efficient. Staff was very helpful during pickup..."
                />
                {errors.positives && (
                  <p className="form-error">{errors.positives.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">What can we improve? (Optional)</label>
                <textarea
                  {...register('improvements')}
                  rows={3}
                  className="form-input resize-none"
                  placeholder="e.g. Pickup process could be a bit faster. Better signage at the pickup point..."
                />
              </div>

              <div>
                <label className="form-label">Would you recommend RentMyRide?</label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {[
                    { value: 'YES',   label: '👍 Yes, definitely!' },
                    { value: 'MAYBE', label: '🤔 Maybe'            },
                    { value: 'NO',    label: '👎 Probably not'     },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input
                        {...register('recommend')}
                        type="radio"
                        value={opt.value}
                        className="accent-orange-500 w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">
                  Any additional comments? (Optional)
                </label>
                <textarea
                  {...register('comments')}
                  rows={2}
                  className="form-input resize-none"
                  placeholder="Any other thoughts or suggestions..."
                />
              </div>
            </div>
          </div>

          {/* Consent */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <input
              {...register('consent')}
              type="checkbox"
              id="consent"
              className="accent-orange-500 w-4 h-4 mt-0.5 flex-shrink-0"
            />
            <label htmlFor="consent" className="text-xs text-gray-500 cursor-pointer leading-relaxed">
              I consent to RentMyRide using this feedback to improve services.
              My review may be displayed publicly (anonymously or with my name).
            </label>
          </div>

          {/* Not all rated warning */}
          {!allRated && ratedAspects.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <span className="text-amber-500">⚠️</span>
              <p className="text-amber-700 text-xs">
                Please rate all 5 aspects before submitting your feedback.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !allRated}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FiSend size={16} />
            {submitting ? '⏳ Submitting...' : 'Submit Feedback 🙏'}
          </button>

          {!allRated && (
            <p className="text-center text-xs text-gray-400">
              Rate all {ASPECTS.length} aspects to enable submission
            </p>
          )}

        </form>
      </div>
    </CustomerLayout>
  )
}
