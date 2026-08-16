import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { paymentService } from '../../services/allServices'
import CustomerLayout from '../../components/layout/CustomerLayout'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers'
import { FiDownload, FiPrinter, FiArrowLeft, FiCheck } from 'react-icons/fi'

// Shows a preview of a payment's receipt and lets the customer download the real PDF
// (generated fresh on the backend from the Payment's own GST breakdown + its booking —
// there's no separate invoice record anymore).
export default function ReceiptPage() {
  const { paymentId } = useParams()
  const navigate       = useNavigate()
  const [payment, setPayment]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    paymentService.getById(paymentId)
      .then(res => setPayment(res.data.data))
      .catch(() => toast.error('Payment not found.'))
      .finally(() => setLoading(false))
  }, [paymentId])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await paymentService.downloadReceipt(paymentId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'receipt-' + paymentId + '.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Receipt downloaded!')
    } catch {
      toast.error('Download failed.')
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => window.print()

  if (loading) return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    </CustomerLayout>
  )

  if (!payment) return (
    <CustomerLayout>
      <div className="text-center py-20">
        <p className="text-5xl mb-4">❌</p>
        <p className="text-xl font-bold text-gray-700">Payment not found</p>
      </div>
    </CustomerLayout>
  )

  const statusColors = {
    SUCCESS: 'badge-success', PENDING: 'badge-warning',
    FAILED: 'badge-danger', REFUNDED: 'badge-gray', PARTIALLY_REFUNDED: 'badge-gray',
  }

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto">

        {/* Top Actions */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium">
            <FiArrowLeft /> Back
          </button>
          <div className="flex gap-3">
            <button onClick={handlePrint}
              className="btn-gray flex items-center gap-2 py-2.5 px-4 text-sm">
              <FiPrinter size={15} /> Print
            </button>
            <button onClick={handleDownload} disabled={downloading}
              className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm
                         disabled:opacity-60 disabled:cursor-not-allowed">
              <FiDownload size={15} />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* Receipt Card */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden" id="receipt-print">

          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-2xl">🚗</div>
                  <div>
                    <h2 className="text-xl font-bold">RentMyRide</h2>
                    <p className="text-gray-400 text-xs">Car Rental Services</p>
                  </div>
                </div>
                <p className="text-gray-400 text-xs">India</p>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold text-orange-400 mb-1">RECEIPT</h1>
                <p className="text-gray-300 font-mono text-sm">RCPT-{String(payment.paymentId).padStart(6, '0')}</p>
                <p className="text-gray-400 text-xs mt-2">
                  {payment.paymentDatetime ? formatDateTime(payment.paymentDatetime) : 'Awaiting payment'}
                </p>
                <div className="mt-3">
                  <span className={statusColors[payment.paymentStatus] || 'badge-gray'}>
                    {payment.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Billed To</h4>
                <p className="font-bold text-gray-800">{payment.customerName}</p>
                <p className="text-gray-500 text-sm">{payment.customerEmail}</p>
                <p className="text-gray-500 text-sm">{payment.customerMobile}</p>
              </div>
              {payment.carBrand && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Vehicle & Trip</h4>
                  <p className="font-bold text-gray-800">{payment.carBrand} {payment.carModel}</p>
                  <p className="text-gray-500 text-sm">Reg: {payment.carRegistrationNumber}</p>
                  {payment.pickupDate && (
                    <p className="text-gray-500 text-sm">
                      {formatDate(payment.pickupDate)} → {formatDate(payment.returnDate)}
                    </p>
                  )}
                  {payment.pickupLocation && (
                    <p className="text-gray-500 text-sm">{payment.pickupLocation} → {payment.dropLocation}</p>
                  )}
                </div>
              )}
            </div>

            {/* Amount breakdown */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Base Amount</span>
                  <span>{formatCurrency(payment.baseAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST @ {payment.gstPercentage}%</span>
                  <span>{formatCurrency(payment.gstAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-800 text-base
                                border-t-2 border-gray-200 pt-3 mt-2">
                  <span>Total Paid</span>
                  <span className="text-orange-500 text-xl">{formatCurrency(payment.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs pt-1">
                  <span>Payment Method</span>
                  <span>{payment.paymentMethod}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-400 space-y-1">
                <p>Thank you for choosing RentMyRide!</p>
                <p>Har Safar, Aapke Saath 🙏</p>
              </div>
              {payment.paymentStatus === 'SUCCESS' && (
                <div className="flex items-center gap-2 text-green-600">
                  <FiCheck size={16} />
                  <span className="text-xs font-semibold">Payment Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </CustomerLayout>
  )
}
