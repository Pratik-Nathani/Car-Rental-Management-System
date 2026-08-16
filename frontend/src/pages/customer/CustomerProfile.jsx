import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { customerService, fileService } from '../../services/allServices'
import CustomerLayout from '../../components/layout/CustomerLayout'
import { formatDate, getFileUrl } from '../../utils/helpers'
import { INDIAN_STATES, GENDERS } from '../../utils/constants'
import { FiEdit2, FiSave, FiX, FiUser, FiMail, FiPhone,
         FiMapPin, FiCalendar, FiShield, FiEye } from 'react-icons/fi'

export default function CustomerProfile() {
  const { user, login } = useAuth()
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  const [uploading, setUploading] = useState(null) // 'dl' | 'aadhar' | null

  useEffect(() => {
    fetchProfile()
  }, [user.userId])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await customerService.getById(user.userId)
      const data = res.data.data
      setProfile(data)
      reset({
        firstName:    data.firstName,
        lastName:     data.lastName,
        mobileNumber: data.mobileNumber,
        alternateMobile: data.alternateMobile || '',
        dateOfBirth:  data.dateOfBirth || '',
        gender:       data.gender || '',
        address:      data.address || '',
        city:         data.city || '',
        state:        data.state || '',
        pincode:      data.pincode || '',
        profileImageUrl: data.profileImageUrl || '',
      })
    } catch {
      toast.error('Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }

  const handleDocUpload = async (file, field) => {
    if (!file) return
    setUploading(field)
    try {
      const uploadRes = await fileService.upload(file)
      const url = uploadRes.data.data.url

      // Backend expects the full profile payload — merge the new document URL into it
      // rather than sending a partial object, or other fields would get wiped.
      const payload = {
        firstName: profile.firstName, lastName: profile.lastName,
        mobileNumber: profile.mobileNumber, alternateMobile: profile.alternateMobile,
        dateOfBirth: profile.dateOfBirth, gender: profile.gender,
        address: profile.address, city: profile.city, state: profile.state, pincode: profile.pincode,
        profileImageUrl: profile.profileImageUrl,
        drivingLicenseImageUrl: field === 'dl' ? url : profile.drivingLicenseImageUrl,
        aadharImageUrl: field === 'aadhar' ? url : profile.aadharImageUrl,
      }
      const res = await customerService.update(user.userId, payload)
      if (res.data.success) {
        setProfile(res.data.data)
        toast.success((field === 'dl' ? 'Driving License' : 'Aadhar') + ' photo uploaded!')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Try again.')
    } finally {
      setUploading(null)
    }
  }

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      const res = await customerService.update(user.userId, data)
      if (res.data.success) {
        setProfile(res.data.data)
        setEditing(false)
        toast.success('Profile updated successfully!')
      } else {
        toast.error(res.data.message || 'Update failed.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setEditing(false)
    reset()
  }

  const statusColors = {
    ACTIVE: 'badge-success', INACTIVE: 'badge-gray',
    BLOCKED: 'badge-danger', PENDING_VERIFICATION: 'badge-warning',
  }

  if (loading) return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    </CustomerLayout>
  )

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto">
        <div className="page-title mb-6">My Profile</div>

        {/* Profile Header Card */}
        <div className="card mb-5 bg-gradient-to-r from-orange-500 to-orange-600">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center
                            justify-center text-4xl font-bold text-white flex-shrink-0">
              {profile?.firstName?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white">
                {profile?.firstName} {profile?.lastName}
              </h2>
              <p className="text-orange-100 text-sm">{profile?.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={statusColors[profile?.accountStatus] || 'badge-gray'}>
                  {profile?.accountStatus?.replace('_', ' ')}
                </span>
                <span className="text-orange-100 text-xs">Customer</span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold
                                 bg-white bg-opacity-20 text-white">
                  🆔 RMR-CUST-{profile?.customerId}
                </span>
                {profile?.trustScore != null && (
                  profile.trustScore === 0 ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold
                                     bg-white bg-opacity-20 text-white">
                      🛡️ Trust Score: Building...
                    </span>
                  ) : (
                    <span className={'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ' +
                      (profile.trustScore >= 80 ? 'bg-green-400 bg-opacity-30 text-white' :
                       profile.trustScore >= 50 ? 'bg-yellow-400 bg-opacity-30 text-white' :
                       'bg-red-400 bg-opacity-30 text-white')}>
                      🛡️ Trust Score: {profile.trustScore}/100
                    </span>
                  )
                )}
              </div>
            </div>
            {!editing && (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30
                           text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                <FiEdit2 size={14} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
          {[
            { key: 'personal',  label: 'Personal Info' },
            { key: 'documents', label: 'Documents'     },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={'px-5 py-2 rounded-lg text-sm font-semibold transition-all ' +
                (activeTab === t.key ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>

          {/* ── Personal Tab ── */}
          {activeTab === 'personal' && (
            <div className="card space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="section-title mb-0 flex items-center gap-2">
                  <FiUser className="text-orange-500" /> Personal Information
                </h3>
                {editing && (
                  <div className="flex gap-2">
                    <button type="button" onClick={cancelEdit}
                      className="flex items-center gap-1.5 text-sm text-gray-500
                                 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg">
                      <FiX size={13} /> Cancel
                    </button>
                    <button type="submit" disabled={saving}
                      className="flex items-center gap-1.5 btn-primary py-1.5 px-4 text-sm
                                 disabled:opacity-60">
                      <FiSave size={13} />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">First Name</label>
                  {editing ? (
                    <>
                      <input {...register('firstName', { required: 'Required' })} className="form-input" />
                      {errors.firstName && <p className="form-error">{errors.firstName.message}</p>}
                    </>
                  ) : (
                    <p className="text-gray-800 font-medium py-2">{profile?.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Last Name</label>
                  {editing ? (
                    <>
                      <input {...register('lastName', { required: 'Required' })} className="form-input" />
                      {errors.lastName && <p className="form-error">{errors.lastName.message}</p>}
                    </>
                  ) : (
                    <p className="text-gray-800 font-medium py-2">{profile?.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label flex items-center gap-1.5">
                  <FiMail size={12} /> Email Address
                </label>
                <p className="text-gray-800 font-medium py-2 flex items-center gap-2">
                  {profile?.email}
                  <span className="badge-success text-xs">Verified</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label flex items-center gap-1.5">
                    <FiPhone size={12} /> Mobile Number
                  </label>
                  {editing ? (
                    <>
                      <input {...register('mobileNumber', {
                        required: 'Mobile number is required',
                        pattern: { value: /^\d{10}$/, message: 'Enter a valid 10-digit number' },
                      })} className="form-input" maxLength={10} />
                      {errors.mobileNumber && <p className="form-error">{errors.mobileNumber.message}</p>}
                    </>
                  ) : (
                    <p className="text-gray-800 font-medium py-2">{profile?.mobileNumber || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Alternate Mobile</label>
                  {editing ? (
                    <input {...register('alternateMobile')} className="form-input" placeholder="Optional" />
                  ) : (
                    <p className="text-gray-800 font-medium py-2">{profile?.alternateMobile || '—'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label flex items-center gap-1.5">
                    <FiCalendar size={12} /> Date of Birth
                  </label>
                  {editing ? (
                    <input {...register('dateOfBirth')} type="date" className="form-input" />
                  ) : (
                    <p className="text-gray-800 font-medium py-2">
                      {profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : '—'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="form-label">Gender</label>
                  {editing ? (
                    <select {...register('gender')} className="form-select">
                      <option value="">Select</option>
                      {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  ) : (
                    <p className="text-gray-800 font-medium py-2">{profile?.gender || '—'}</p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                  <FiMapPin size={13} className="text-orange-500" /> Address
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="form-label">Street Address</label>
                    {editing ? (
                      <input {...register('address')} className="form-input" placeholder="House no, Street, Area" />
                    ) : (
                      <p className="text-gray-800 font-medium py-2">{profile?.address || '—'}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="form-label">City</label>
                      {editing ? (
                        <input {...register('city')} className="form-input" />
                      ) : (
                        <p className="text-gray-800 font-medium py-2">{profile?.city || '—'}</p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">State</label>
                      {editing ? (
                        <select {...register('state')} className="form-select">
                          <option value="">State</option>
                          {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <p className="text-gray-800 font-medium py-2">{profile?.state || '—'}</p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Pincode</label>
                      {editing ? (
                        <>
                          <input {...register('pincode', {
                            pattern: { value: /^\d{6}$/, message: '6-digit pincode' },
                          })} className="form-input" maxLength={6} />
                          {errors.pincode && <p className="form-error">{errors.pincode.message}</p>}
                        </>
                      ) : (
                        <p className="text-gray-800 font-medium py-2">{profile?.pincode || '—'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Documents Tab ── */}
          {activeTab === 'documents' && (
            <div className="card space-y-5">
              <h3 className="section-title flex items-center gap-2">
                <FiShield className="text-orange-500" /> Documents
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                ℹ️ Document numbers can't be edited after registration — contact support for changes.
                But you can upload/update photos of your documents below for verification.
              </div>
              {[
                { label: 'Driving License Number', value: profile?.drivingLicenseNumber, icon: '🪪' },
                { label: 'DL Expiry Date',         value: profile?.drivingLicenseExpiry ? formatDate(profile.drivingLicenseExpiry) : '—', icon: '📅' },
                { label: 'Aadhar Number',          value: profile?.aadharNumber ? '••••••••' + profile.aadharNumber.slice(-4) : '—', icon: '🔒' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
                    <p className="text-gray-800 font-semibold mt-0.5">{value || '—'}</p>
                  </div>
                </div>
              ))}

              {/* Document Photo Uploads */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                {[
                  { key: 'dl', label: 'Driving License Photo', url: getFileUrl(profile?.drivingLicenseImageUrl) },
                  { key: 'aadhar', label: 'Aadhar Card Photo', url: getFileUrl(profile?.aadharImageUrl) },
                ].map(({ key, label, url }) => {
                  const isPdf = url?.toLowerCase().endsWith('.pdf')
                  return (
                    <div key={key} className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center">
                      <p className="text-xs font-semibold text-gray-600 mb-2">{label}</p>
                      {url ? (
                        isPdf ? (
                          <div className="w-full h-32 bg-gray-50 rounded-lg mb-2 flex flex-col items-center justify-center text-gray-400">
                            <span className="text-3xl">📄</span>
                            <span className="text-[10px] mt-1">PDF Document</span>
                          </div>
                        ) : (
                          <img src={url} alt={label} className="w-full h-32 object-cover rounded-lg mb-2"
                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                        )
                      ) : (
                        <div className="w-full h-32 bg-gray-50 rounded-lg mb-2 flex items-center justify-center text-3xl text-gray-300">
                          📄
                        </div>
                      )}
                      {/* Fallback shown if the image fails to load (broken URL, deleted file, etc) */}
                      {url && !isPdf && (
                        <div style={{ display: 'none' }}
                          className="w-full h-32 bg-red-50 rounded-lg mb-2 -mt-[8.5rem] flex-col items-center justify-center text-red-400 text-xs">
                          <span className="text-2xl">⚠️</span>
                          <span className="mt-1">Couldn't load image</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {url && (
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="btn-gray text-xs py-2 flex-1 inline-flex items-center justify-center gap-1">
                            <FiEye size={12} /> View
                          </a>
                        )}
                        <label className={'btn-secondary text-xs py-2 cursor-pointer inline-flex items-center justify-center ' + (url ? 'flex-1' : 'w-full')}>
                          {uploading === key ? 'Uploading...' : url ? 'Replace' : 'Upload Photo'}
                          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                            disabled={uploading === key}
                            onChange={e => handleDocUpload(e.target.files[0], key)} />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </form>
      </div>
    </CustomerLayout>
  )
}
