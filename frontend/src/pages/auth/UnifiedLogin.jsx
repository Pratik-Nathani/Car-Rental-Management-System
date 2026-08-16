import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { FiMail, FiLock, FiEye, FiEyeOff, FiPhone } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/allServices'

const ROLE_HOME = {
  CUSTOMER: '/customer/dashboard',
  DRIVER:   '/driver/dashboard',
  ADMIN:    '/admin/dashboard',
}

const ROLE_WELCOME = {
  CUSTOMER: (name) => 'Welcome back, ' + name + '! 🙏',
  DRIVER:   (name) => 'Welcome back, ' + name + '! Drive safe 🚕',
  ADMIN:    (name) => 'Welcome, ' + name + '!',
}

// One login form for everyone — customer, driver, or admin. We don't ask which type of
// account it is; the backend (`POST /api/auth/login`) looks the identifier up across all
// three tables and tells us the role, and we route to the right dashboard from there.
export default function UnifiedLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('password')
  const [otpStep, setOtpStep] = useState(1)
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpLoading, setOtpLoading] = useState(false)

  const handleAuthSuccess = (data) => {
    login(data)
    const welcome = ROLE_WELCOME[data.role] || ((n) => 'Welcome back, ' + n + '!')
    toast.success(welcome(data.name))
    navigate(ROLE_HOME[data.role] || '/login')
  }

  // Password Login — POST /api/auth/login (role auto-detected)
  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await authService.unifiedLogin({
        username: data.username,
        password: data.password,
      })
      if (res.data.success) {
        handleAuthSuccess(res.data)
      } else {
        toast.error(res.data.message || 'Login failed.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // OTP handlers — customer accounts only (sends a 6-digit code to the registered email)
  const sendOtp = async () => {
    if (!identifier.trim()) { toast.error('Enter your registered email or mobile number.'); return }
    setOtpLoading(true)
    try {
      await authService.sendLoginOtp(identifier.trim())
      toast.success('OTP sent to your registered email 📧')
      setOtpStep(2)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send OTP. Try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleOtpChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return
    const updated = [...otp]
    updated[idx] = val
    setOtp(updated)
    if (val && idx < 5) document.getElementById('otp-' + (idx + 1))?.focus()
    if (val && idx === 5) {
      const code = updated.join('')
      if (code.length === 6) setTimeout(() => verifyOtp(code), 100)
    }
  }

  const verifyOtp = async (code = otp.join('')) => {
    if (code.length < 6) { toast.error('Enter complete 6-digit OTP.'); return }
    setLoading(true)
    try {
      const res = await authService.verifyLoginOtp(identifier.trim(), code)
      if (res.data.success) {
        handleAuthSuccess(res.data)
      } else {
        toast.error(res.data.message || 'OTP verification failed.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen overflow-y-auto flex">

      {/* ── Left Panel ── */}
      <div className="hidden lg:flex w-5/12 flex-col justify-between p-12 relative overflow-hidden
                      bg-gradient-to-br from-blue-900 via-blue-800 to-orange-700">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white opacity-5" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-orange-400 opacity-10" />

        {/* Brand */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-xl">🚗</div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">RentMyRide</p>
            <p className="text-blue-200 text-xs">Har Safar, Aapke Saath</p>
          </div>
        </div>

        {/* Hero */}
        <div className="z-10">
          <h1 className="text-5xl font-bold text-white leading-tight mb-4">
            One Login.<br />Every
            <span className="text-orange-400"> Role</span>
          </h1>
          <p className="text-blue-200 mb-8 leading-relaxed">
            Customer, driver, or admin — sign in with the same form. We take you straight to your dashboard.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[['500+','Locations'],['240+','Cars'],['18%','GST Incl.']].map(([n, l]) => (
              <div key={l} className="bg-white bg-opacity-10 rounded-xl p-3 text-center">
                <p className="text-orange-400 font-bold text-xl">{n}</p>
                <p className="text-blue-200 text-xs mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="z-10 flex gap-3 flex-wrap">
          <span className="bg-white bg-opacity-10 text-white text-xs px-3 py-1.5 rounded-lg">💳 UPI / Razorpay</span>
          <span className="bg-white bg-opacity-10 text-white text-xs px-3 py-1.5 rounded-lg">🔒 256-bit SSL</span>
          <span className="bg-white bg-opacity-10 text-white text-xs px-3 py-1.5 rounded-lg">📄 GST Receipt</span>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md animate-fade-in">

          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-base">🚗</div>
            <span className="font-bold text-gray-800">RentMyRide</span>
          </div>

          <h2 className="text-3xl font-bold text-gray-800 mb-1">Welcome back</h2>
          <p className="text-gray-500 mb-6">Sign in — works for customer, driver & admin accounts</p>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {[['password', '🔐 Password'], ['otp', '📱 OTP Login']].map(([t, label]) => (
              <button key={t} type="button" onClick={() => { setTab(t); setOtpStep(1) }}
                className={'flex-1 py-2 rounded-lg text-sm font-semibold transition-all ' +
                  (tab === t ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {label}
              </button>
            ))}
          </div>

          {/* Password Tab */}
          {tab === 'password' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="form-label">Email / Mobile Number</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                  <input
                    {...register('username', { required: 'Email or mobile is required' })}
                    className="form-input pl-9"
                    placeholder="you@email.com or 9876543210"
                    autoComplete="username"
                  />
                </div>
                {errors.username && <p className="form-error">{errors.username.message}</p>}
              </div>

              <div>
                <label className="form-label">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                  <input
                    {...register('password', { required: 'Password is required' })}
                    type={showPass ? 'text' : 'password'}
                    className="form-input pl-9 pr-10"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                    {showPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.password && <p className="form-error">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input type="checkbox" className="accent-orange-500 w-4 h-4" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-sm text-orange-500 font-medium hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? '⏳ Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* OTP Tab */}
          {tab === 'otp' && (
            <div className="space-y-4">
              {otpStep === 1 && (
                <>
                  <div>
                    <label className="form-label">Email or Mobile Number</label>
                    <div className="relative">
                      <FiPhone className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                      <input value={identifier} onChange={e => setIdentifier(e.target.value)}
                        className="form-input pl-9" placeholder="you@email.com or 9876543210" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">OTP login currently works for customer accounts. We'll email a 6-digit code to your registered address.</p>
                  </div>
                  <button onClick={sendOtp} disabled={otpLoading} className="btn-primary w-full py-3 disabled:opacity-60">
                    {otpLoading ? '⏳ Sending...' : 'Send OTP'}
                  </button>
                </>
              )}
              {otpStep === 2 && (
                <>
                  <p className="text-sm text-gray-600 mb-2">
                    OTP sent for <strong className="text-gray-800">{identifier}</strong>
                    <button onClick={() => setOtpStep(1)} className="text-orange-500 ml-2 text-xs underline">Change</button>
                  </p>
                  <div className="flex gap-2 justify-between mb-2">
                    {otp.map((d, i) => (
                      <input key={i} id={'otp-' + i} value={d}
                        onChange={e => handleOtpChange(e.target.value, i)} maxLength={1}
                        className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-200
                                   rounded-xl focus:border-orange-500 focus:outline-none transition-colors" />
                    ))}
                  </div>
                  <button onClick={() => verifyOtp()} disabled={loading} className="btn-primary w-full py-3">
                    {loading ? '⏳ Verifying...' : 'Verify & Login'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs">New to RentMyRide?</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <Link to="/register"
            className="block text-center w-full py-2.5 border-2 border-gray-200
                       rounded-lg text-sm font-semibold text-gray-700
                       hover:border-orange-400 hover:text-orange-500 transition-all">
            Create Account
          </Link>

        </div>
      </div>
    </div>
  )
}
