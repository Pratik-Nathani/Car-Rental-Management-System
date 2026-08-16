import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiClock } from 'react-icons/fi'
import { authService } from '../../services/allServices'

export default function ForgotPassword() {
  const navigate = useNavigate()
  
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [verifiedOtp, setVerifiedOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [timer, setTimer] = useState(0)
  const [requestTimeout, setRequestTimeout] = useState(null)
  // Inline, per-field errors — shown right under the field itself (not just a toast that
  // can be missed), so the user immediately sees WHICH field is wrong and WHY.
  const [fieldErrors, setFieldErrors] = useState({})

  // FIX #1: Timer effect - NO dependency on timer (prevents memory leak)
  useEffect(() => {
    if (timer <= 0) return
    
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          toast.error('❌ OTP expired - please request a new one')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, []) // ✅ FIXED: No dependency - prevents recreating interval every tick

  // FIX #6: Cleanup on unmount (Security + Privacy)
  useEffect(() => {
    return () => {
      // Clear all form data when component unmounts
      setEmail('')
      setNewPassword('')
      setConfirmPassword('')
      setOtp(['', '', '', '', '', ''])
      setVerifiedOtp('')
      setStep(1)
      setTimer(0)
    }
  }, [])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // FIX #9: Timeout handling + FIX #2: Email trim
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setFieldErrors({})
    
    // FIX #2: Trim email
    const trimmedEmail = email.trim()
    
    if (!trimmedEmail) {
      setFieldErrors({ email: 'Please enter your email address' })
      return
    }
    
    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFieldErrors({ email: 'Enter a valid email address, e.g. name@example.com' })
      return
    }
    
    // Prevent double submission
    if (loading) return
    
    setLoading(true)
    
    // FIX #9: Timeout handling (5 second timeout)
    const timeoutId = setTimeout(() => {
      setLoading(false)
      toast.error('⏱️ Request timeout - please try again')
    }, 15000)
    
    try {
      await authService.sendForgotPasswordOtp(trimmedEmail)
      
      clearTimeout(timeoutId)
      toast.success('✅ OTP sent to your email')
      setStep(2)
      setTimer(300) // 5 minutes
      setEmail(trimmedEmail) // Store trimmed email
    } catch (err) {
      clearTimeout(timeoutId)
      const msg = err.response?.data?.message || 'Failed to send OTP - please try again'
      setFieldErrors({ email: msg })
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // FIX #5: OTP auto-submit when 6 digits filled
  const handleOtpChange = (value, index) => {
    // Only allow numbers
    if (!/^\d?$/.test(value)) return
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    
    // Auto focus next field
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
    
    // FIX #5: Auto-verify if all 6 digits filled
    if (value && index === 5) {
      const otpCode = newOtp.join('')
      if (otpCode.length === 6) {
        // Auto submit after slight delay
        setTimeout(() => {
          handleVerifyOtp(otpCode)
        }, 100)
      }
    }
  }

  // FIX #3: Proper setTimeout handling
  const handleVerifyOtp = async (otpCode = otp.join('')) => {
    setFieldErrors({})
    if (otpCode.length < 6) {
      setFieldErrors({ otp: 'Enter all 6 digits of the code' })
      return
    }
    
    if (timer === 0) {
      setFieldErrors({ otp: 'This code has expired — request a new one' })
      return
    }

    setLoading(true)
    
    try {
      await authService.verifyForgotPasswordOtp(email, otpCode)
      toast.success('✅ OTP verified successfully')
      setVerifiedOtp(otpCode)
      setStep(3)
      setOtp(['', '', '', '', '', '']) // Clear OTP after verification
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid OTP - please try again'
      setFieldErrors({ otp: msg })
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // FIX #11: Password space validation + FIX #12: Confirm empty check
  const handleResetPassword = async () => {
    setFieldErrors({})
    if (!newPassword?.trim()) {
      setFieldErrors({ newPassword: 'Please enter a new password' })
      return
    }
    if (!confirmPassword?.trim()) {
      setFieldErrors({ confirmPassword: 'Please re-enter your new password' })
      return
    }
    
    // FIX #11: Check trimmed length
    if (newPassword.trim().length < 6) {
      setFieldErrors({ newPassword: 'Password must be at least 6 characters' })
      return
    }
    
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' })
      return
    }

    setLoading(true)
    
    try {
      await authService.resetPassword(email, verifiedOtp, newPassword)
      toast.success('✅ Password reset successfully!')
      
      // Cleanup and redirect
      setEmail('')
      setNewPassword('')
      setConfirmPassword('')
      setOtp(['', '', '', '', '', ''])
      setVerifiedOtp('')
      setStep(1)
      setTimer(0)
      
      setTimeout(() => navigate('/login'), 1000)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password - please try again'
      setFieldErrors({ newPassword: msg })
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToStep1 = () => {
    setStep(1)
    setOtp(['', '', '', '', '', ''])
    setTimer(0)
  }

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-blue-900 via-blue-800 to-orange-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Back Button */}
        <Link 
          to="/login" 
          className="inline-flex items-center gap-2 text-white hover:text-orange-200 mb-8 transition-colors"
          aria-label="Back to login"
        >
          <FiArrowLeft size={18} /> Back to Login
        </Link>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4">
              🔐
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Reset Password</h1>
            <p className="text-gray-500 text-sm mt-2">Step {step} of 3</p>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <div 
                key={s} 
                className={`flex-1 h-2 rounded-full transition-all ${
                  s <= step ? 'bg-orange-500' : 'bg-gray-200'
                }`} 
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                {/* FIX #8: Proper label with htmlFor */}
                <label 
                  htmlFor="email-input"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                  {/* FIX #7: Max length on email */}
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value.slice(0, 254)); if (fieldErrors.email) setFieldErrors({}) }}
                    maxLength="254"
                    className={'w-full pl-10 pr-4 py-2.5 border-2 rounded-lg focus:outline-none transition-colors ' +
                      (fieldErrors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-orange-500')}
                    placeholder="your@email.com"
                    aria-label="Email address"
                    aria-describedby="email-help"
                  />
                </div>
                {fieldErrors.email ? (
                  <p className="form-error">{fieldErrors.email}</p>
                ) : (
                  <p id="email-help" className="text-xs text-gray-500 mt-1">
                    We'll send a verification code to your email
                  </p>
                )}
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-all"
              >
                {loading ? '⏳ Sending...' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-2">
                Verification code sent to <strong className="text-gray-800">{email}</strong>
              </p>
              
              {/* FIX #10: Show timer status (even when 0) */}
              <div className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-colors ${
                timer === 0
                  ? 'bg-red-50 border-red-300'
                  : timer <= 60 
                  ? 'bg-red-50 border-red-300' 
                  : timer <= 180
                  ? 'bg-orange-50 border-orange-300'
                  : 'bg-green-50 border-green-300'
              }`}>
                <FiClock className={`flex-shrink-0 text-lg ${
                  timer === 0
                    ? 'text-red-600'
                    : timer <= 60 ? 'text-red-600' : timer <= 180 ? 'text-orange-600' : 'text-green-600'
                }`} />
                <div className="flex-1">
                  <p className={`font-bold text-sm ${
                    timer === 0
                      ? 'text-red-600'
                      : timer <= 60 ? 'text-red-600' : timer <= 180 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {timer === 0 ? '❌ OTP Expired' : `⏱️ ${formatTime(timer)} remaining`}
                  </p>
                </div>
              </div>
              
              {/* OTP Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Enter 6-Digit OTP
                </label>
                <div className="flex gap-2 justify-between mb-1">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => { handleOtpChange(e.target.value, i); if (fieldErrors.otp) setFieldErrors({}) }}
                      maxLength="1"
                      className={'w-12 h-12 text-center text-xl font-bold border-2 rounded-lg focus:outline-none transition-colors disabled:bg-gray-100 ' +
                        (fieldErrors.otp ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-orange-500')}
                      disabled={timer === 0}
                      aria-label={`OTP digit ${i + 1}`}
                    />
                  ))}
                </div>
                {fieldErrors.otp && <p className="form-error mb-3">{fieldErrors.otp}</p>}
              </div>

              {/* Verify Button */}
              <button
                onClick={() => handleVerifyOtp()}
                disabled={loading || timer === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-all"
              >
                {loading ? '⏳ Verifying...' : 'Verify OTP'}
              </button>

              {/* Request New OTP */}
              {timer === 0 && (
                <button
                  onClick={handleBackToStep1}
                  type="button"
                  className="w-full text-orange-500 hover:text-orange-600 font-semibold py-2 transition-colors"
                >
                  ← Request New OTP
                </button>
              )}
            </div>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-2">Create a strong new password</p>

              {/* New Password */}
              <div>
                <label 
                  htmlFor="new-password"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  New Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-3.5 text-gray-400" />
                  {/* FIX #4: autoComplete attribute */}
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); if (fieldErrors.newPassword) setFieldErrors({}) }}
                    autoComplete="new-password"
                    className={'w-full pl-10 pr-10 py-2.5 border-2 rounded-lg focus:outline-none transition-colors ' +
                      (fieldErrors.newPassword ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-orange-500')}
                    placeholder="Min 6 characters"
                    aria-label="New password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {fieldErrors.newPassword && <p className="form-error">{fieldErrors.newPassword}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label 
                  htmlFor="confirm-password"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-3.5 text-gray-400" />
                  {/* FIX #4: autoComplete attribute */}
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors({}) }}
                    autoComplete="new-password"
                    className={'w-full pl-10 pr-10 py-2.5 border-2 rounded-lg focus:outline-none transition-colors ' +
                      (fieldErrors.confirmPassword ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-orange-500')}
                    placeholder="Re-enter password"
                    aria-label="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <p className="form-error">{fieldErrors.confirmPassword}</p>}
              </div>

              {/* Reset Button */}
              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-all"
              >
                {loading ? '⏳ Resetting...' : 'Reset Password'}
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-white text-sm mt-6">
          Remember your password?{' '}
          <Link 
            to="/login" 
            className="text-orange-300 hover:text-orange-100 font-semibold transition-colors"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
