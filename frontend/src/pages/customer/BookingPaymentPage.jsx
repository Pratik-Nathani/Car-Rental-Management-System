import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { reservationService, paymentService } from '../../services/allServices'
import CustomerLayout from '../../components/layout/CustomerLayout'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { FiCreditCard, FiCheck, FiShield, FiInfo } from 'react-icons/fi'

const MIN_DEPOSIT = 1000

export default function BookingPaymentPage() {
  const { reservationId } = useParams()
  const navigate = useNavigate()

  const [reservation, setReservation] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [processing, setProcessing] = useState(false)
  const [payType, setPayType]     = useState('FULL') // 'FULL' | 'DEPOSIT'
  const [depositAmount, setDepositAmount] = useState(MIN_DEPOSIT)

  useEffect(() => {
    reservationService.getById(reservationId)
      .then(res => setReservation(res.data.data))
      .catch(() => toast.error('Reservation not found.'))
      .finally(() => setLoading(false))
  }, [reservationId])

  const balanceDue = reservation?.balanceDue ?? reservation?.estimatedAmount ?? 0

  const handlePay = async () => {
    if (payType === 'DEPOSIT' && depositAmount < MIN_DEPOSIT) {
      toast.error(`Minimum deposit is ${formatCurrency(MIN_DEPOSIT)}.`)
      return
    }
    setProcessing(true)
    try {
      // Step 1: Create a Razorpay order for the amount being paid now
      const orderRes = await paymentService.createReservationOrder({
        reservationId: Number(reservationId),
        paymentType: payType,
        amount: payType === 'DEPOSIT' ? Number(depositAmount) : null,
      })
      const orderData = orderRes.data.data

      // Step 2: Open Razorpay's checkout — customer picks UPI/Card/NetBanking/Wallet here
      const options = {
        key:          orderData.keyId,
        amount:       Math.round(orderData.amount * 100),
        currency:     orderData.currency || 'INR',
        name:         'RentMyRide',
        description:  'Booking #RES-' + reservationId + (payType === 'DEPOSIT' ? ' (Deposit)' : ' (Full Payment)'),
        order_id:     orderData.orderId,
        prefill: {
          name:    orderData.customerName,
          email:   orderData.customerEmail,
          contact: orderData.customerContact,
        },
        theme: { color: '#FF6B00' },
        handler: async (response) => {
          // Step 3: Verify the payment signature and confirm the booking
          try {
            const verifyRes = await paymentService.verifyReservationPayment({
              reservationId: Number(reservationId),
              paymentType: payType,
              amount: orderData.amount,
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            if (verifyRes.data.success) {
              toast.success(payType === 'FULL' ? 'Payment successful! Booking confirmed 🎉' : 'Deposit paid! Booking confirmed 🎉')
              navigate('/customer/bookings')
            } else {
              toast.error(verifyRes.data.message || 'Payment verification failed.')
            }
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification error.')
          } finally {
            setProcessing(false)
          }
        },
        modal: {
          ondismiss: () => { toast.error('Payment cancelled.'); setProcessing(false) }
        }
      }

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options)
        rzp.open()
      } else {
        toast.error('Payment gateway not loaded. Check your internet connection.')
        setProcessing(false)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initiation failed.')
      setProcessing(false)
    }
  }

  if (loading) return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    </CustomerLayout>
  )

  if (!reservation) return (
    <CustomerLayout>
      <div className="text-center py-20">
        <p className="text-5xl mb-4">❌</p>
        <p className="text-xl font-bold text-gray-700">Reservation not found</p>
      </div>
    </CustomerLayout>
  )

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="page-title">Confirm Your Booking</h2>
          <p className="text-gray-500 text-sm mt-1">Booking #RES-{reservation.reservationId}</p>
        </div>

        <div className="space-y-5">

          {/* Booking Summary */}
          <div className="card">
            <h3 className="section-title">🚗 Booking Details</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-bold text-gray-800">{reservation.carBrand} {reservation.carModel}</p>
              <p className="text-gray-400 text-xs mt-0.5">{reservation.carRegistrationNumber}</p>
              <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                <div className="bg-white rounded-lg p-2.5">
                  <p className="text-gray-400">Trip Type</p>
                  <p className="font-semibold text-gray-700 mt-0.5">
                    {reservation.tripType === 'OUTSTATION' ? '🛣️ Outstation' : '🏙️ Local'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2.5">
                  <p className="text-gray-400">Pickup</p>
                  <p className="font-semibold text-gray-700 mt-0.5">{formatDate(reservation.pickupDate)}</p>
                </div>
                <div className="bg-white rounded-lg p-2.5">
                  <p className="text-gray-400">Route</p>
                  <p className="font-semibold text-gray-700 mt-0.5">{reservation.pickupLocation} → {reservation.dropLocation}</p>
                </div>
                <div className="bg-white rounded-lg p-2.5">
                  <p className="text-gray-400">Duration</p>
                  <p className="font-semibold text-gray-700 mt-0.5">
                    {reservation.totalDays > 0 ? reservation.totalDays + ' day(s)' : 'Same-day'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="card">
            <h3 className="section-title">🧾 Bill Summary</h3>
            <div className="space-y-2 text-sm">
              {reservation.tripType === 'OUTSTATION' ? (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Round-trip distance</span>
                    <span className="font-medium">{reservation.distanceKm} km</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Base fare</span>
                    <span className="font-medium">{formatCurrency(reservation.baseFare)}</span>
                  </div>
                  {reservation.nightCharges > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Night charges ({reservation.nights} night{reservation.nights > 1 ? 's' : ''})</span>
                      <span className="font-medium">{formatCurrency(reservation.nightCharges)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between text-gray-600">
                  <span>Local package ({Math.max(reservation.totalDays, 1)} day)</span>
                  <span className="font-medium">{formatCurrency(reservation.baseFare)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-2">
                <span>Total Amount</span>
                <span className="text-orange-500 text-lg">{formatCurrency(reservation.estimatedAmount)}</span>
              </div>
              {reservation.amountPaid > 0 && (
                <div className="flex justify-between text-green-600 text-xs">
                  <span>Already paid</span>
                  <span>{formatCurrency(reservation.amountPaid)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-800">
                <span>Balance Due</span>
                <span>{formatCurrency(balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Payment Option: Full vs Deposit */}
          <div className="card">
            <h3 className="section-title flex items-center gap-2">
              <FiCreditCard className="text-orange-500" /> How would you like to pay?
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button type="button" onClick={() => setPayType('FULL')}
                className={'p-4 rounded-xl border-2 text-left transition-all ' +
                  (payType === 'FULL' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300')}>
                <p className="font-semibold text-sm text-gray-800">Pay in Full</p>
                <p className="text-gray-500 text-xs mt-1">{formatCurrency(balanceDue)}</p>
                {payType === 'FULL' && <FiCheck className="text-orange-500 mt-1" size={14} />}
              </button>
              <button type="button" onClick={() => setPayType('DEPOSIT')}
                className={'p-4 rounded-xl border-2 text-left transition-all ' +
                  (payType === 'DEPOSIT' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300')}>
                <p className="font-semibold text-sm text-gray-800">Pay Deposit</p>
                <p className="text-gray-500 text-xs mt-1">Min. {formatCurrency(MIN_DEPOSIT)}</p>
                {payType === 'DEPOSIT' && <FiCheck className="text-orange-500 mt-1" size={14} />}
              </button>
            </div>

            {payType === 'DEPOSIT' && (
              <div className="mb-4">
                <label className="form-label">Deposit Amount (₹)</label>
                <input type="number" min={MIN_DEPOSIT} max={balanceDue} value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  className="form-input" />
                <p className="text-gray-400 text-xs mt-1">
                  Remaining {formatCurrency(Math.max(0, balanceDue - depositAmount))} will be due at pickup.
                </p>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
              <FiCreditCard className="text-gray-400 flex-shrink-0" size={16} />
              <p className="text-gray-500 text-xs">
                You'll choose UPI, Card, Net Banking, or Wallet on the next screen.
              </p>
            </div>
          </div>

          {/* Cancellation policy note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <FiInfo className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-blue-700 text-xs leading-relaxed">
              Free cancellation up to 12 hours before pickup. Cancelling within 12 hours of pickup
              deducts a minimum ₹500 fee from your refund.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
            <FiShield className="text-green-500 flex-shrink-0" size={20} />
            <p className="text-green-700 text-xs">Your payment is secure and encrypted.</p>
          </div>

          <button onClick={handlePay} disabled={processing}
            className="btn-primary w-full py-4 text-lg disabled:opacity-60 disabled:cursor-not-allowed">
            {processing ? '⏳ Processing...' :
              `Pay ${formatCurrency(payType === 'FULL' ? balanceDue : depositAmount)} & Confirm Booking`}
          </button>

        </div>
      </div>
    </CustomerLayout>
  )
}
