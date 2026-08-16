import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { customerService } from '../../services/allServices'
import AdminLayout from '../../components/layout/AdminLayout'
import { formatDate, formatPhone, getBadgeClass, getStatusInfo, getFileUrl } from '../../utils/helpers'
import { CUSTOMER_ACCOUNT_STATUS } from '../../utils/constants'
import { FiSearch, FiX, FiEye, FiUserX, FiUserCheck } from 'react-icons/fi'

export default function ManageCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('')
  const [selected,  setSelected]  = useState(null)
  const [updating,  setUpdating]  = useState(null)

  useEffect(() => { fetchCustomers() }, [])

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const res = await customerService.getAll()
      setCustomers(res.data.data || [])
    } catch { toast.error('Failed to load customers.') }
    finally { setLoading(false) }
  }

  const handleSearch = async () => {
    if (!search.trim()) { fetchCustomers(); return }
    setLoading(true)
    try {
      const res = await customerService.search(search)
      setCustomers(res.data.data || [])
    } catch { toast.error('Search failed.') }
    finally { setLoading(false) }
  }

  const handleStatusChange = async (customerId, status) => {
    setUpdating(customerId)
    try {
      await customerService.updateStatus(customerId, status)
      toast.success('Customer status updated!')
      fetchCustomers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.')
    } finally { setUpdating(null) }
  }

  const filtered = customers.filter(c =>
    !filter || c.accountStatus === filter
  )

  const statusBg = {
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-gray-100 text-gray-500',
    BLOCKED: 'bg-red-100 text-red-600',
    PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="page-title">Manage Customers</h2>
          <p className="text-gray-500 text-sm">{customers.length} total customers</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {CUSTOMER_ACCOUNT_STATUS.map(s => (
          <div key={s.value}
            onClick={() => setFilter(filter === s.value ? '' : s.value)}
            className={'bg-white rounded-xl p-3 border-2 text-center cursor-pointer transition-all ' +
              (filter === s.value ? 'border-orange-400' : 'border-gray-100 hover:border-gray-200')}>
            <p className="text-2xl font-bold text-gray-800">
              {customers.filter(c => c.accountStatus === s.value).length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="card mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-3.5 text-gray-400 text-sm" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="form-input pl-9" placeholder="Search name, email or mobile..." />
        </div>
        <button onClick={handleSearch} className="btn-primary py-2.5 px-5">Search</button>
        {(search || filter) && (
          <button onClick={() => { setSearch(''); setFilter(''); fetchCustomers() }}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500">
            <FiX size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-bold text-gray-700">No customers found</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Mobile</th>
                <th>City / State</th>
                <th>Driving License</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.customerId}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center
                                      justify-center text-orange-600 font-bold text-sm flex-shrink-0">
                        {c.firstName?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="text-gray-400 text-xs">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm text-gray-600">{formatPhone(c.mobileNumber)}</td>
                  <td className="text-sm text-gray-500">
                    {c.city || '—'}{c.state ? ', ' + c.state : ''}
                  </td>
                  <td className="text-sm font-mono text-gray-500">
                    {c.drivingLicenseNumber || '—'}
                  </td>
                  <td className="text-sm text-gray-500">{formatDate(c.createdAt)}</td>
                  <td>
                    <span className={'text-xs font-semibold px-2.5 py-1 rounded-full ' +
                      (statusBg[c.accountStatus] || 'bg-gray-100 text-gray-500')}>
                      {c.accountStatus?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelected(c)}
                        className="w-8 h-8 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center
                                   justify-center text-blue-500 transition-colors">
                        <FiEye size={13} />
                      </button>
                      {c.accountStatus === 'ACTIVE' ? (
                        <button
                          onClick={() => handleStatusChange(c.customerId, 'BLOCKED')}
                          disabled={updating === c.customerId}
                          className="w-8 h-8 bg-red-50 hover:bg-red-100 rounded-lg flex items-center
                                     justify-center text-red-500 transition-colors disabled:opacity-50">
                          <FiUserX size={13} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(c.customerId, 'ACTIVE')}
                          disabled={updating === c.customerId}
                          className="w-8 h-8 bg-green-50 hover:bg-green-100 rounded-lg flex items-center
                                     justify-center text-green-500 transition-colors disabled:opacity-50">
                          <FiUserCheck size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-gray-800 text-lg">Customer Details</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <FiX size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl">
                <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center
                                justify-center text-white font-bold text-xl">
                  {selected.firstName?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-lg">
                    {selected.firstName} {selected.lastName}
                  </p>
                  <p className="text-gray-500 text-sm">{selected.email}</p>
                  <span className={'text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1 inline-block ' +
                    (statusBg[selected.accountStatus] || '')}>
                    {selected.accountStatus?.replace('_', ' ')}
                  </span>
                  {selected.trustScore != null && (
                    <span className={'text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1 ml-1.5 inline-block ' +
                      (selected.trustScore >= 80 ? 'bg-green-100 text-green-700' :
                       selected.trustScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                       'bg-red-100 text-red-700')}>
                      🛡️ Trust: {selected.trustScore}/100
                    </span>
                  )}
                </div>
              </div>
              {[
                ['Customer ID',       'RMR-CUST-' + selected.customerId],
                ['Mobile',            formatPhone(selected.mobileNumber)],
                ['Alternate Mobile',  selected.alternateMobile || '—'],
                ['Date of Birth',     selected.dateOfBirth ? formatDate(selected.dateOfBirth) : '—'],
                ['Gender',            selected.gender || '—'],
                ['Address',           selected.address || '—'],
                ['City',              selected.city || '—'],
                ['State',             selected.state || '—'],
                ['Pincode',           selected.pincode || '—'],
                ['Driving License',   selected.drivingLicenseNumber || '—'],
                ['DL Expiry',         selected.drivingLicenseExpiry ? formatDate(selected.drivingLicenseExpiry) : '—'],
                ['Aadhar',            selected.aadharNumber ? '••••••••' + selected.aadharNumber.slice(-4) : '—'],
                ['Joined On',         formatDate(selected.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className="text-gray-800 text-sm font-medium">{value}</span>
                </div>
              ))}

              {/* Uploaded KYC document photos — for verification before approving */}
              {(selected.drivingLicenseImageUrl || selected.aadharImageUrl) && (
                <div className="grid grid-cols-2 gap-3 pt-3">
                  {[
                    { label: 'Driving License Photo', url: getFileUrl(selected.drivingLicenseImageUrl) },
                    { label: 'Aadhar Card Photo', url: getFileUrl(selected.aadharImageUrl) },
                  ].filter(d => d.url).map(({ label, url }) => {
                    const isPdf = url.toLowerCase().endsWith('.pdf')
                    return (
                      <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                        className="border border-gray-100 rounded-xl p-2 text-center hover:border-blue-300 transition-all group">
                        {isPdf ? (
                          <div className="w-full h-20 bg-gray-50 rounded-lg mb-1.5 flex items-center justify-center text-2xl text-gray-400">📄</div>
                        ) : (
                          <img src={url} alt={label} className="w-full h-20 object-cover rounded-lg mb-1.5" />
                        )}
                        <p className="text-[10px] text-gray-500 group-hover:text-blue-500 flex items-center justify-center gap-1">
                          <FiEye size={10} /> View {label}
                        </p>
                      </a>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {selected.accountStatus === 'ACTIVE' ? (
                  <button
                    onClick={() => { handleStatusChange(selected.customerId, 'BLOCKED'); setSelected(null) }}
                    className="btn-danger flex-1 py-2.5 text-sm">
                    Block Customer
                  </button>
                ) : (
                  <button
                    onClick={() => { handleStatusChange(selected.customerId, 'ACTIVE'); setSelected(null) }}
                    className="btn-primary flex-1 py-2.5 text-sm">
                    Activate Customer
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="btn-gray flex-1 py-2.5 text-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
