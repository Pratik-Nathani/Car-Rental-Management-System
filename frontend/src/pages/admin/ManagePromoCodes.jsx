import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { promoCodeService } from '../../services/allServices'
import AdminLayout from '../../components/layout/AdminLayout'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiTag } from 'react-icons/fi'

const EMPTY = {
  code: '', description: '', discountType: 'PERCENTAGE', discountValue: '',
  maxDiscountAmount: '', minBookingAmount: '', validFrom: '', validUntil: '',
  usageLimit: '', active: true,
}

export default function ManagePromoCodes() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: EMPTY })
  const [promos, setPromos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { fetchPromos() }, [])

  const fetchPromos = async () => {
    setLoading(true)
    try {
      const res = await promoCodeService.getAll()
      setPromos(res.data.data || [])
    } catch {
      toast.error('Failed to load promo codes.')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => { setEditing(null); reset(EMPTY); setShowForm(true) }
  const openEdit = (promo) => {
    setEditing(promo)
    reset({
      code: promo.code, description: promo.description || '',
      discountType: promo.discountType, discountValue: promo.discountValue,
      maxDiscountAmount: promo.maxDiscountAmount || '', minBookingAmount: promo.minBookingAmount || '',
      validFrom: promo.validFrom || '', validUntil: promo.validUntil || '',
      usageLimit: promo.usageLimit || '', active: promo.active,
    })
    setShowForm(true)
  }

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      const payload = {
        code: data.code.trim().toUpperCase(),
        description: data.description || null,
        discountType: data.discountType,
        discountValue: Number(data.discountValue),
        maxDiscountAmount: data.maxDiscountAmount ? Number(data.maxDiscountAmount) : null,
        minBookingAmount: data.minBookingAmount ? Number(data.minBookingAmount) : null,
        validFrom: data.validFrom || null,
        validUntil: data.validUntil || null,
        usageLimit: data.usageLimit ? Number(data.usageLimit) : null,
        active: data.active === true || data.active === 'true',
      }
      const res = editing
        ? await promoCodeService.update(editing.promoId, payload)
        : await promoCodeService.create(payload)
      if (res.data.success) {
        toast.success(editing ? 'Promo code updated!' : 'Promo code created!')
        setShowForm(false)
        fetchPromos()
      } else {
        toast.error(res.data.message || 'Failed to save.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save promo code.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (promoId) => {
    if (!window.confirm('Delete this promo code? This cannot be undone.')) return
    setDeleting(promoId)
    try {
      await promoCodeService.delete(promoId)
      toast.success('Promo code deleted.')
      fetchPromos()
    } catch {
      toast.error('Failed to delete.')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <FiTag className="text-orange-500" /> Promo Codes
          </h2>
          <p className="text-gray-500 text-sm mt-1">Create discount codes customers can apply at booking.</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2.5">
          <FiPlus size={16} /> New Promo Code
        </button>
      </div>

      {promos.length === 0 ? (
        <div className="text-center py-20 card">
          <p className="text-5xl mb-4">🎟️</p>
          <p className="text-xl font-bold text-gray-700 mb-2">No promo codes yet</p>
          <button onClick={openAdd} className="btn-primary px-6 py-2.5 mt-2">Create your first code</button>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                <th className="pb-3">Code</th>
                <th className="pb-3">Discount</th>
                <th className="pb-3">Min. Booking</th>
                <th className="pb-3">Validity</th>
                <th className="pb-3">Usage</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => (
                <tr key={p.promoId} className="border-b border-gray-50">
                  <td className="py-3 font-mono font-bold text-gray-800">{p.code}</td>
                  <td className="py-3 text-gray-600">
                    {p.discountType === 'PERCENTAGE' ? p.discountValue + '%' : formatCurrency(p.discountValue)}
                    {p.maxDiscountAmount ? <span className="text-gray-400 text-xs"> (max {formatCurrency(p.maxDiscountAmount)})</span> : null}
                  </td>
                  <td className="py-3 text-gray-600">{p.minBookingAmount ? formatCurrency(p.minBookingAmount) : '—'}</td>
                  <td className="py-3 text-gray-500 text-xs">
                    {p.validFrom ? formatDate(p.validFrom) : 'Anytime'} → {p.validUntil ? formatDate(p.validUntil) : 'No expiry'}
                  </td>
                  <td className="py-3 text-gray-600">{p.usedCount}{p.usageLimit ? ' / ' + p.usageLimit : ''}</td>
                  <td className="py-3">
                    <span className={p.active ? 'badge-success' : 'badge-gray'}>{p.active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="py-3 text-right">
                    <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-orange-500 p-1.5"><FiEdit2 size={14} /></button>
                    <button onClick={() => handleDelete(p.promoId)} disabled={deleting === p.promoId}
                      className="text-gray-400 hover:text-red-500 p-1.5"><FiTrash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
             onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{editing ? 'Edit' : 'New'} Promo Code</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="form-label">Code *</label>
                <input {...register('code', { required: 'Required' })} disabled={!!editing}
                  className="form-input uppercase disabled:bg-gray-100" placeholder="FIRST100" />
                {errors.code && <p className="form-error">{errors.code.message}</p>}
              </div>
              <div>
                <label className="form-label">Description</label>
                <input {...register('description')} className="form-input" placeholder="First booking discount" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Discount Type *</label>
                  <select {...register('discountType', { required: true })} className="form-select">
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Discount Value *</label>
                  <input type="number" step="0.01" {...register('discountValue', {
                    required: 'Required', min: { value: 0, message: 'Cannot be negative' },
                  })}
                    className="form-input" placeholder="10" />
                  {errors.discountValue && <p className="form-error">{errors.discountValue.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Max Discount (₹)</label>
                  <input type="number" {...register('maxDiscountAmount')} className="form-input" placeholder="Optional cap" />
                </div>
                <div>
                  <label className="form-label">Min Booking Amount (₹)</label>
                  <input type="number" {...register('minBookingAmount')} className="form-input" placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Valid From</label>
                  <input type="date" {...register('validFrom')} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Valid Until</label>
                  <input type="date" {...register('validUntil')} className="form-input" />
                </div>
              </div>
              <div>
                <label className="form-label">Usage Limit</label>
                <input type="number" {...register('usageLimit')} className="form-input" placeholder="Leave blank for unlimited" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" {...register('active')} className="w-4 h-4" defaultChecked /> Active
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-60">
                  <FiSave size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
