import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { adminService } from '../../services/allServices'
import AdminLayout from '../../components/layout/AdminLayout'
import { FiUser, FiMail, FiShield, FiLock, FiSave, FiEye, FiEyeOff } from 'react-icons/fi'

const TABS = [
  { key: 'profile',  label: 'Profile',  icon: FiUser   },
  { key: 'security', label: 'Security', icon: FiShield },
]

export default function AdminSettings() {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  // ── Profile Form ──────────────────────────────────────
  const profileForm = useForm({
    defaultValues: { name: user?.name || '', email: user?.email || '' },
  })
  const [savingProfile, setSavingProfile] = useState(false)

  const onSaveProfile = async (data) => {
    setSavingProfile(true)
    try {
      await adminService.updateProfile({ name: data.name, email: data.email })
      updateUser({ name: data.name, email: data.email })
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Security / Change Password Form ──────────────────
  const securityForm = useForm()
  const [savingPassword, setSavingPassword] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const newPassword = securityForm.watch('newPassword')

  const onChangePassword = async (data) => {
    setSavingPassword(true)
    try {
      await adminService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      toast.success('Password changed!')
      securityForm.reset()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl">
        <div className="page-title mb-2">Admin Settings</div>
        <p className="text-gray-500 text-sm mb-6">Manage your profile and security.</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit flex-wrap">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ' +
                (activeTab === key ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="card space-y-4">
            <h3 className="section-title flex items-center gap-2">
              <FiUser className="text-orange-500" /> Admin Profile
            </h3>
            <div>
              <label className="form-label flex items-center gap-1.5">
                <FiUser size={12} /> Name *
              </label>
              <input {...profileForm.register('name', { required: 'Required' })} className="form-input" />
              {profileForm.formState.errors.name && (
                <p className="form-error">{profileForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="form-label flex items-center gap-1.5">
                <FiMail size={12} /> Email *
              </label>
              <input type="email" {...profileForm.register('email', {
                required: 'Required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email format' },
              })} className="form-input" />
              {profileForm.formState.errors.email && (
                <p className="form-error">{profileForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="flex justify-between items-center py-2 border-t border-gray-100 pt-4">
              <span className="text-gray-400 text-sm flex items-center gap-1.5">
                <FiShield size={12} /> Role
              </span>
              <span className="badge-info">{user?.role || 'ADMIN'}</span>
            </div>
            <button type="submit" disabled={savingProfile}
              className="btn-primary flex items-center gap-2 py-2.5 px-6 disabled:opacity-60">
              <FiSave size={15} /> {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        )}

        {/* ── Security Tab ── */}
        {activeTab === 'security' && (
          <form onSubmit={securityForm.handleSubmit(onChangePassword)} className="card space-y-4">
            <h3 className="section-title flex items-center gap-2">
              <FiLock className="text-orange-500" /> Change Password
            </h3>

            <div>
              <label className="form-label">Current Password *</label>
              <div className="relative">
                <input type={showCurrent ? 'text' : 'password'}
                  {...securityForm.register('currentPassword', { required: 'Required' })}
                  className="form-input pr-10" autoComplete="current-password" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                  {showCurrent ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {securityForm.formState.errors.currentPassword && (
                <p className="form-error">{securityForm.formState.errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">New Password *</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'}
                  {...securityForm.register('newPassword', {
                    required: 'Required',
                    minLength: { value: 6, message: 'Minimum 6 characters' },
                  })}
                  className="form-input pr-10" autoComplete="new-password" placeholder="Minimum 6 characters" />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                  {showNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {securityForm.formState.errors.newPassword && (
                <p className="form-error">{securityForm.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Confirm New Password *</label>
              <input type="password"
                {...securityForm.register('confirmPassword', {
                  required: 'Please confirm your new password',
                  validate: v => v === newPassword || 'Passwords do not match',
                })}
                className="form-input" autoComplete="new-password" placeholder="Re-enter new password" />
              {securityForm.formState.errors.confirmPassword && (
                <p className="form-error">{securityForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <button type="submit" disabled={savingPassword}
              className="btn-primary flex items-center gap-2 py-2.5 px-6 disabled:opacity-60">
              <FiSave size={15} /> {savingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        )}
      </div>
    </AdminLayout>
  )
}
