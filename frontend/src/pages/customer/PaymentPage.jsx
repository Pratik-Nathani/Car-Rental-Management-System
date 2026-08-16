import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { rentalService, paymentService } from '../../services/allServices'
import CustomerLayout from '../../components/layout/CustomerLayout'
import { formatCurrency, calculateGST } from '../../utils/helpers'
import { PAYMENT_METHODS } from '../../utils/constants'
import { FiCreditCard, FiCheck, FiShield } from 'react-icons/fi'

export default function PaymentPage() {
  const { rentalId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [rental, setRental] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [payMethod, setPayMethod] = useState('UPI')
  const [paymentTimer, setPaymentTimer] = useState(900) // 15 minutes

  // Fix: No dependency on paymentTimer (prevents memory leak)
  useEffect(() => {
    if (paymentTimer <= 0) return
    
    const timer = setInterval(() => {
      setPaymentTimer(prev => {
        if (prev <= 1) {
          toast.error('❌ Payment order expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, []) // No dependency - fixes memory leak

  useEffect(() => {
    rentalService.getById(rentalId)
      .then(res => setRental(res.data.data))
      .catch(() => toast.error('Rental not found.'))
      .finally(() => setLoading(false))
  }, [rentalId])

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const getTimerColor = () => {
    if (paymentTimer === 0) return 'text-red-600'
    if (paymentTimer <= 60) return 'text-red-600'
    if (paymentTimer <= 300) return 'text-orange-600'
    return 'text-green-600'
  }

  // Fix #12: Check if order expired before allowing payment
  const handlePayment = async () => {
    if (paymentTimer <= 0) {
      toast.error('❌ Payment order has expired. Please refresh and try again.')
      return
    }

    setProcessing(true)
    try {
      // Step 1: Create Razorpay Order
      const orderRes = await paymentService.createOrder({
        rentalId: Number(rentalId),
        paymentMethod: payMethod,
      })

      const orderData = orderRes.data.data

      // Step 2: Open Razorpay Checkout
      const options = {
        key:          orderData.keyId,
        amount:       orderData.amount * 100,
        currency:     orderData.currency || 'INR',
        name:         'RentMyRide',
        description:  'Car Rental Payment',
        order_id:     orderData.orderId,
        prefill: {
          name:    orderData.customerName,
          email:   orderData.customerEmail,
          contact: orderData.customerContact,
        },
        theme: { color: '#FF6B00' },
        handler: async (response) => {
          // Step 3: Verify Payment
          try {
            const verifyRes = await paymentService.verify({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            if (verifyRes.data.success) {
              toast.success('Payment successful! 🎉')
              navigate('/customer/bookings')
            } else {
              toast.error('Payment verification failed.')
            }
          } catch {
            toast.error('Payment verification error.')
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
        toast.error('Razorpay not loaded. Check your internet connection.')
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

  if (!rental) return (
    <CustomerLayout>
      <div className="text-center py-20">
        <p className="text-5xl mb-4">❌</p>
        <p className="text-xl font-bold text-gray-700">Rental not found</p>
      </div>
    </CustomerLayout>
  )

  const { cgst, sgst, grandTotal } = calculateGST(rental.totalAmount)

  const paymentIcons = {
    UPI: '📱', CREDIT_CARD: '💳', DEBIT_CARD: '💳',
    NET_BANKING: '🏦', CASH: '💵', WALLET: '👛',
  }

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="page-title">Complete Payment</h2>
          <p className="text-gray-500 text-sm mt-1">Rental #{rental.rentalId}</p>
        </div>

        <div className="space-y-5">

          {/* Rental Summary */}
          <div className="card">
            <h3 className="section-title">🚗 Rental Details</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-800">{rental.carBrand} {rental.carModel}</p>
                  <p className="text-gray-400 text-xs">{rental.carRegistrationNumber}</p>
                </div>
                <span className="badge-info">Active</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white rounded-lg p-2.5">
                  <p className="text-gray-400">Customer</p>
                  <p className="font-semibold text-gray-700 mt-0.5">{rental.customerName}</p>
                </div>
                {rental.driverName && (
                  <div className="bg-white rounded-lg p-2.5">
                    <p className="text-gray-400">Driver</p>
                    <p className="font-semibold text-gray-700 mt-0.5">{rental.driverName}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="card">
            <h3 className="section-title">🧾 Bill Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Base Rental Amount</span>
                <span className="font-medium">{formatCurrency(rental.baseAmount)}</span>
              </div>
              {rental.extraKmCharges > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Extra KM Charges</span>
                  <span className="font-medium text-red-500">+ {formatCurrency(rental.extraKmCharges)}</span>
                </div>
              )}
              {rental.damageCharges > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Damage Charges</span>
                  <span className="font-medium text-red-500">+ {formatCurrency(rental.damageCharges)}</span>
                </div>
              )}
              {rental.lateReturnCharges > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Late Return Charges</span>
                  <span className="font-medium text-red-500">+ {formatCurrency(rental.lateReturnCharges)}</span>
                </div>
              )}
              {rental.discountAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount</span>
                  <span className="font-medium text-green-500">- {formatCurrency(rental.discountAmount)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>Subtotal</span>
                  <span>{formatCurrency(rental.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>CGST @ 9%</span>
                  <span>{formatCurrency(cgst)}</span>
                </div>
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>SGST @ 9%</span>
                  <span>{formatCurrency(sgst)}</span>
                </div>
              </div>
              <div className="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-3">
                <span className="text-base">Total Payable</span>
                <span className="text-orange-500 text-xl">{formatCurrency(grandTotal)}</span>
              </div>
              <p className="text-xs text-gray-400 text-right">Plus 18% GST (CGST 9% + SGST 9%)</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="card">
            <h3 className="section-title flex items-center gap-2">
              <FiCreditCard className="text-orange-500" /> Payment Method
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map(m => (
                <button key={m.value} type="button" onClick={() => setPayMethod(m.value)}
                  className={'p-3 rounded-xl border-2 text-left transition-all ' +
                    (payMethod === m.value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300')}>
                  <span className="text-lg mr-2">{paymentIcons[m.value]}</span>
                  <span className={'text-sm font-medium ' +
                    (payMethod === m.value ? 'text-orange-600' : 'text-gray-700')}>
                    {m.label}
                  </span>
                  {payMethod === m.value && (
                    <FiCheck className="float-right text-orange-500 mt-0.5" size={14} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Security Note */}
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
            <FiShield className="text-green-500 flex-shrink-0" size={20} />
            <div>
              <p className="text-green-700 text-sm font-semibold">Secure Payment</p>
              <p className="text-green-600 text-xs">Your payment is encrypted and processed via Razorpay. RBI compliant.</p>
            </div>
          </div>

          {/* Pay Button */}
          <button onClick={handlePayment} disabled={processing}
            className="btn-primary w-full py-4 text-lg disabled:opacity-60 disabled:cursor-not-allowed">
            {processing ? '⏳ Processing...' : `Pay ${formatCurrency(grandTotal)} via ${PAYMENT_METHODS.find(m=>m.value===payMethod)?.label}`}
          </button>

        </div>
      </div>
    </CustomerLayout>
  )
}
