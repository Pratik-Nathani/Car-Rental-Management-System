import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiChevronRight, FiChevronLeft, FiCheck } from 'react-icons/fi'
import { authService } from '../../services/allServices'
import { INDIAN_STATES, GENDERS } from '../../utils/constants'

const STEPS = [
  { title: 'Personal Info',      icon: '👤' },
  { title: 'Contact & Address',  icon: '📞' },
  { title: 'Documents',          icon: '📄' },
  { title: 'Set Password',       icon: '🔐' },
]

export default function Register() {
  const navigate = useNavigate()
  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm({ mode: 'onChange' })
  const [step, setStep]         = useState(0)
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConf, setShowConf] = useState(false)

  const password = watch('password')

  // Step validation fields
  const stepFields = [
    ['firstName', 'lastName'],
    ['email', 'mobileNumber', 'city', 'state'],
    ['aadharNumber'],
    ['password', 'confirmPassword'],
  ]

  const nextStep = async () => {
    const valid = await trigger(stepFields[step])
    if (valid) setStep(s => s + 1)
  }

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match!')
      return
    }
    setLoading(true)
    try {
      const res = await authService.customerRegister({
        firstName:             data.firstName,
        lastName:              data.lastName,
        email:                 data.email,
        password:              data.password,
        mobileNumber:          data.mobileNumber,
        alternateMobile:       data.alternateMobile || null,
        dateOfBirth:           data.dateOfBirth || null,
        gender:                data.gender || null,
        city:                  data.city,
        state:                 data.state,
        pincode:               data.pincode || null,
        address:               data.address || null,
        drivingLicenseNumber:  data.drivingLicenseNumber || null,
        drivingLicenseExpiry:  data.drivingLicenseExpiry || null,
        aadharNumber:          data.aadharNumber,
        referredByCode:        data.referredByCode || null,
      })
      if (res.data.success) {
        toast.success('Account created! Please login. 🎉')
        navigate('/login')
      } else {
        toast.error(res.data.message || 'Registration failed.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Server error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'form-input'
  const lbl = 'form-label'
  const err = 'form-error'

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl animate-fade-in">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">🚗</div>
            <span className="font-bold text-xl text-gray-800">RentMyRide</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Create Account</h2>
          <p className="text-gray-500 mt-1 text-sm">Join us and start your journey today</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ' +
                  (i < step  ? 'bg-green-500 text-white' :
                   i === step ? 'bg-orange-500 text-white ring-4 ring-orange-100' :
                                'bg-gray-200 text-gray-400')}>
                  {i < step ? <FiCheck /> : s.icon}
                </div>
                <span className={'text-xs mt-1.5 font-medium whitespace-nowrap ' +
                  (i === step ? 'text-orange-500' : i < step ? 'text-green-500' : 'text-gray-400')}>
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={'h-0.5 w-10 mx-1 mb-4 transition-all duration-300 ' +
                  (i < step ? 'bg-green-400' : 'bg-gray-200')} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* ── Step 0: Personal Info ── */}
            {step === 0 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="section-title">👤 Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>First Name *</label>
                    <input {...register('firstName', { required: 'Required' })}
                      className={inp} placeholder="Rahul" />
                    {errors.firstName && <p className={err}>{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Last Name *</label>
                    <input {...register('lastName', { required: 'Required' })}
                      className={inp} placeholder="Sharma" />
                    {errors.lastName && <p className={err}>{errors.lastName.message}</p>}
                  </div>
                </div>
                <div>
                  <label className={lbl}>Date of Birth</label>
                  <input {...register('dateOfBirth')} type="date" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Gender</label>
                  <select {...register('gender')} className="form-select">
                    <option value="">Select gender</option>
                    {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ── Step 1: Contact & Address ── */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="section-title">📞 Contact & Address</h3>
                <div>
                  <label className={lbl}>Email Address *</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                    <input {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email format' }
                    })} className={inp + ' pl-9'} placeholder="rahul@email.com" />
                  </div>
                  {errors.email && <p className={err}>{errors.email.message}</p>}
                </div>
                <div>
                  <label className={lbl}>Mobile Number *</label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                    <input {...register('mobileNumber', {
                      required: 'Mobile is required',
                      pattern: { value: /^\d{10}$/, message: 'Enter valid 10-digit number' }
                    })} className={inp + ' pl-9'} placeholder="9876543210" maxLength={10} />
                  </div>
                  {errors.mobileNumber && <p className={err}>{errors.mobileNumber.message}</p>}
                </div>
                <div>
                  <label className={lbl}>Street Address</label>
                  <input {...register('address')} className={inp} placeholder="House no, Street, Area" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>City *</label>
                    <input {...register('city', { required: 'Required' })} className={inp} placeholder="Pune" />
                    {errors.city && <p className={err}>{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className={lbl}>State *</label>
                    <select {...register('state', { required: 'Required' })} className="form-select">
                      <option value="">State</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.state && <p className={err}>{errors.state.message}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Pincode</label>
                    <input {...register('pincode')} className={inp} placeholder="411001" maxLength={6} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Documents ── */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="section-title">📄 Documents</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2">
                  <span className="text-blue-500 text-lg">ℹ️</span>
                  <p className="text-blue-700 text-xs leading-relaxed">
                    Your documents are encrypted and stored securely as per RBI & Govt. guidelines.
                    Required for rental verification.
                  </p>
                </div>
                <div>
                  <label className={lbl}>Driving License Number <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input {...register('drivingLicenseNumber')}
                    className={inp} placeholder="MH12-2019-0123456" />
                  {errors.drivingLicenseNumber && <p className={err}>{errors.drivingLicenseNumber.message}</p>}
                </div>
                <div>
                  <label className={lbl}>DL Expiry Date</label>
                  <input {...register('drivingLicenseExpiry')} type="date" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Aadhar Number *</label>
                  <input {...register('aadharNumber', {
                    required: 'Aadhar number is required',
                    pattern: { value: /^\d{12}$/, message: 'Enter valid 12-digit Aadhar number' }
                  })} className={inp} placeholder="1234 5678 9012" maxLength={12} />
                  {errors.aadharNumber && <p className={err}>{errors.aadharNumber.message}</p>}
                </div>
                <div>
                  <label className={lbl}>Referral Code <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input {...register('referredByCode')} className={inp + ' uppercase'} placeholder="e.g. RAHUL482" />
                  <p className="text-gray-400 text-xs mt-1">Got a friend's code? Enter it — you both get ₹200 wallet credit!</p>
                </div>
              </div>
            )}

            {/* ── Step 3: Password ── */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="section-title">🔐 Set Your Password</h3>
                <div>
                  <label className={lbl}>Password *</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                    <input {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Minimum 6 characters' }
                    })} type={showPass ? 'text' : 'password'}
                      className={inp + ' pl-9 pr-10'} placeholder="Minimum 6 characters" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                      {showPass ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  {errors.password && <p className={err}>{errors.password.message}</p>}
                </div>
                <div>
                  <label className={lbl}>Confirm Password *</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                    <input {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: v => v === password || 'Passwords do not match'
                    })} type={showConf ? 'text' : 'password'}
                      className={inp + ' pl-9 pr-10'} placeholder="Re-enter password" />
                    <button type="button" onClick={() => setShowConf(!showConf)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                      {showConf ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className={err}>{errors.confirmPassword.message}</p>}
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <p className="text-orange-700 text-xs leading-relaxed">
                    ✅ By creating an account, you agree to our Terms & Conditions and Privacy Policy.
                    18% GST will be applied on all bookings as per Indian tax laws.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-100">
              {step > 0 ? (
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className="btn-gray flex items-center gap-2 py-2.5 px-5">
                  <FiChevronLeft /> Back
                </button>
              ) : (
                <div />
              )}

              {step < STEPS.length - 1 ? (
                <button type="button" onClick={nextStep}
                  className="btn-primary flex items-center gap-2 py-2.5 px-6">
                  Next <FiChevronRight />
                </button>
              ) : (
                <button type="submit" disabled={loading}
                  className="btn-primary py-2.5 px-8 disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? '⏳ Creating Account...' : '🎉 Create Account'}
                </button>
              )}
            </div>

          </form>
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-500 font-semibold hover:underline">Sign In</Link>
        </p>

      </div>
    </div>
  )
}
