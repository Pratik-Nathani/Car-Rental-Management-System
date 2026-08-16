import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import {
  FiHome, FiTruck, FiUsers, FiUserCheck, FiCalendar,
  FiKey, FiCreditCard, FiStar, FiTag,
  FiLogOut, FiMenu, FiX, FiBell, FiChevronDown, FiSettings, FiArrowLeft
} from 'react-icons/fi'

const NAV = [
  { to: '/admin/dashboard',    icon: FiHome,      label: 'Dashboard'      },
  { to: '/admin/cars',         icon: FiTruck,     label: 'Manage Cars'    },
  { to: '/admin/customers',    icon: FiUsers,     label: 'Customers'      },
  { to: '/admin/drivers',      icon: FiUserCheck, label: 'Drivers'        },
  { to: '/admin/reservations', icon: FiCalendar,  label: 'Reservations'   },
  { to: '/admin/rentals',      icon: FiKey,       label: 'Rentals'        },
  { to: '/admin/payments',     icon: FiCreditCard,label: 'Payments'       },
  { to: '/admin/feedback',     icon: FiStar,      label: 'Feedback'       },
  { to: '/admin/promo-codes',  icon: FiTag,       label: 'Promo Codes'    },
]

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Logged out!')
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path
  const pageTitle = NAV.find(n => isActive(n.to))?.label || 'Dashboard'

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className={
        'fixed inset-y-0 left-0 z-50 w-64 h-screen bg-gray-900 flex flex-col overflow-y-auto transition-transform duration-300 ' +
        (sidebarOpen ? 'translate-x-0' : '-translate-x-full') +
        ' lg:translate-x-0'
      }>
        {/* Brand */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-lg">🚗</div>
            <div>
              <p className="font-bold text-white text-sm">RentMyRide</p>
              <p className="text-orange-400 text-xs font-semibold">Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <FiX size={18} />
          </button>
        </div>

        {/* Admin Info */}
        <div className="mx-3 mt-4 mb-2 p-3 bg-gray-800 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center
                            text-white font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm truncate">{user?.name || 'Admin'}</p>
              <p className="text-orange-400 text-xs">Administrator</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ' +
                (isActive(to)
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white')
              }>
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-700 space-y-1">
          <Link to="/admin/settings"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
                       font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all">
            <FiSettings size={16} /> Settings
          </Link>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
                       font-medium text-red-400 hover:bg-red-900 hover:text-red-300
                       transition-all w-full">
            <FiLogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 h-screen overflow-hidden">

        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4
                           flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700">
              <FiMenu size={22} />
            </button>
            {location.pathname !== '/admin/dashboard' && (
              <button onClick={() => navigate(-1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500
                           hover:bg-gray-100 hover:text-gray-800 transition-all flex-shrink-0"
                aria-label="Go back">
                <FiArrowLeft size={18} />
              </button>
            )}
            <div>
              <h1 className="font-bold text-gray-800 text-lg leading-tight">{pageTitle}</h1>
              <p className="text-gray-400 text-xs">RentMyRide — Admin</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative w-9 h-9 bg-gray-100 rounded-xl flex items-center
                               justify-center text-gray-500 hover:bg-orange-50 hover:text-orange-500 transition-all">
              <FiBell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <div className="relative">
              <button onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl hover:bg-orange-50 transition-all">
                <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center
                                justify-center text-white text-xs font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {user?.name?.split(' ')[0] || 'Admin'}
                </span>
                <FiChevronDown size={14} className="text-gray-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-12 w-48 bg-white rounded-xl
                                shadow-lg border border-gray-100 py-2 z-50">
                  <button onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-500
                               hover:bg-red-50 w-full">
                    <FiLogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
