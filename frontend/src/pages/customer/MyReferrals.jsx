import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { customerService } from '../../services/allServices'
import CustomerLayout from '../../components/layout/CustomerLayout'
import { formatCurrency } from '../../utils/helpers'
import { FiGift, FiCopy, FiShare2, FiUsers, FiDollarSign } from 'react-icons/fi'

export default function MyReferrals() {
  const { user } = useAuth()
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    customerService.getReferral(user.userId)
      .then(res => setInfo(res.data.data))
      .catch(() => toast.error('Failed to load referral info.'))
      .finally(() => setLoading(false))
  }, [])

  const shareMessage = info
    ? `Book cars easily on RentMyRide! Use my referral code ${info.referralCode} when you sign up and we both get ₹${info.bonusPerReferral} wallet credit. 🚗`
    : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(info.referralCode)
    toast.success('Referral code copied!')
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'RentMyRide Referral', text: shareMessage }).catch(() => {})
    } else {
      navigator.clipboard.writeText(shareMessage)
      toast.success('Message copied — paste it anywhere to share!')
    }
  }

  if (loading) {
    return (
      <CustomerLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout>
      <div className="mb-6">
        <h2 className="page-title flex items-center gap-2">
          <FiGift className="text-orange-500" /> Refer & Earn
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Invite friends to RentMyRide — you both get {formatCurrency(info?.bonusPerReferral)} wallet credit!
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-6">
        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center gap-2 mb-2 text-orange-100 text-xs font-semibold uppercase tracking-wide">
            <FiDollarSign size={14} /> Wallet Balance
          </div>
          <p className="text-3xl font-bold">{formatCurrency(info?.walletBalance)}</p>
          <p className="text-orange-100 text-xs mt-1">Auto-applied at your next booking</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs font-semibold uppercase tracking-wide">
            <FiUsers size={14} /> Friends Referred
          </div>
          <p className="text-3xl font-bold text-gray-800">{info?.referredCount || 0}</p>
          <p className="text-gray-400 text-xs mt-1">who signed up using your code</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs font-semibold uppercase tracking-wide">
            <FiGift size={14} /> Bonus Per Referral
          </div>
          <p className="text-3xl font-bold text-gray-800">{formatCurrency(info?.bonusPerReferral)}</p>
          <p className="text-gray-400 text-xs mt-1">credited to both of you</p>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Your Referral Code</h3>
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-2xl font-mono font-bold text-orange-500 tracking-widest flex-1">
            {info?.referralCode || '—'}
          </p>
          <button onClick={handleCopy} className="btn-secondary px-4 py-2 flex items-center gap-2 text-sm">
            <FiCopy size={14} /> Copy
          </button>
          <button onClick={handleShare} className="btn-primary px-4 py-2 flex items-center gap-2 text-sm">
            <FiShare2 size={14} /> Share
          </button>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
          <p>1️⃣ Share your code with friends</p>
          <p>2️⃣ They enter it while signing up on RentMyRide</p>
          <p>3️⃣ You both instantly get {formatCurrency(info?.bonusPerReferral)} in wallet credit 🎉</p>
        </div>
      </div>
    </CustomerLayout>
  )
}
