import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { notificationService } from '../../services/allServices'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'
import {
  FiHome, FiSearch, FiCalendar, FiUser,
  FiLogOut, FiMenu, FiX, FiBell, FiChevronDown, FiArrowLeft, FiGift
} from 'react-icons/fi'

const NAV = [
  { to: '/customer/dashboard', icon: FiHome,     labelKey: 'dashboard'    },
  { to: '/customer/cars',      icon: FiSearch,    labelKey: 'browseCars'  },
  { to: '/customer/bookings',  icon: FiCalendar,  labelKey: 'myBookings'  },
  { to: '/customer/referrals', icon: FiGift,      labelKey: 'referAndEarn'},
  { to: '/customer/profile',   icon: FiUser,      labelKey: 'profile'     },
]

export default function CustomerLayout({ children }) {
  const { user, logout } = useAuth()
  const { language, toggleLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user?.userId) return
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [user?.userId])

  const fetchUnreadCount = () => {
    notificationService.getUnreadCount(user.userId)
      .then(res => setUnreadCount(res.data.data || 0))
      .catch(() => {})
  }

  const openNotifications = () => {
    setNotifOpen(prev => !prev)
    if (!notifOpen) {
      notificationService.getForCustomer(user.userId)
        .then(res => setNotifications(res.data.data || []))
        .catch(() => {})
    }
  }

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead(user.userId)
      .then(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      })
      .catch(() => {})
  }

  const handleNotificationClick = (n) => {
    if (!n.read) {
      notificationService.markAsRead(n.notificationId)
        .then(() => {
          setNotifications(prev => prev.map(x => x.notificationId === n.notificationId ? { ...x, read: true } : x))
          setUnreadCount(prev => Math.max(0, prev - 1))
        })
        .catch(() => {})
    }
    if (n.relatedReservationId) {
      navigate('/customer/bookings')
      setNotifOpen(false)
    }
  }

  const NOTIF_ICON = { BOOKING_CONFIRMED: '🎉', PAYMENT_DUE: '💳', CANCELLATION: '❌', GENERAL: '📢' }

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully!')
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className={
        'fixed inset-y-0 left-0 z-50 w-64 h-screen bg-white border-r border-gray-100 flex flex-col overflow-y-auto transition-transform duration-300 ' +
        (sidebarOpen ? 'translate-x-0' : '-translate-x-full') +
        ' lg:translate-x-0'
      }>
        {/* Brand */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-lg">🚗</div>
            <div>
              <p className="font-bold text-gray-800 text-sm leading-tight">RentMyRide</p>
              <p className="text-orange-500 text-xs font-semibold">Rentals</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
            <FiX size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="mx-4 mt-4 mb-2 p-3 bg-orange-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center
                            text-white font-bold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{user?.name}</p>
              <p className="text-orange-500 text-xs">Customer</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {NAV.map(({ to, icon: Icon, labelKey }) => (
            <Link key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={isActive(to) ? 'sidebar-link-active' : 'sidebar-link'}>
              <Icon size={18} />
              <span>{t(labelKey)}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout}
            className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600">
            <FiLogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 h-screen overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700">
              <FiMenu size={22} />
            </button>
            {location.pathname !== '/customer/dashboard' && (
              <button onClick={() => navigate(-1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500
                           hover:bg-gray-100 hover:text-gray-800 transition-all flex-shrink-0"
                aria-label="Go back">
                <FiArrowLeft size={18} />
              </button>
            )}
            <div>
              <h1 className="font-bold text-gray-800 text-lg leading-tight">
                {t(NAV.find(n => isActive(n.to))?.labelKey || 'dashboard')}
              </h1>
              <p className="text-gray-400 text-xs">RentMyRide</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleLanguage}
              className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center
                         text-gray-500 hover:bg-orange-50 hover:text-orange-500 transition-all
                         text-xs font-bold" title="Switch language">
              {language === 'en' ? 'हिं' : 'EN'}
            </button>
            <div className="relative">
              <button onClick={openNotifications}
                className="relative w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center
                           text-gray-500 hover:bg-orange-50 hover:text-orange-500 transition-all">
                <FiBell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-orange-500 rounded-full
                                    text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border
                                   border-gray-100 z-50 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white">
                      <p className="font-semibold text-gray-800 text-sm">Notifications</p>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-xs text-orange-500 hover:underline">
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-8">No notifications yet</p>
                    ) : (
                      notifications.map(n => (
                        <button key={n.notificationId} onClick={() => handleNotificationClick(n)}
                          className={'w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-all flex gap-2.5 ' +
                            (!n.read ? 'bg-orange-50/40' : '')}>
                          <span className="text-lg flex-shrink-0">{NOTIF_ICON[n.type] || '📢'}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                              {n.title}
                              {!n.read && <span className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0" />}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-gray-350 mt-1">{formatDate(n.createdAt)}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl
                           hover:bg-orange-50 transition-all">
                <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center
                                text-white text-xs font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name?.split(' ')[0]}</span>
                <FiChevronDown size={14} className="text-gray-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <Link to="/customer/profile" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500">
                    <FiUser size={14} /> My Profile
                  </Link>
                  <hr className="my-1 border-gray-100" />
                  <button onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 w-full">
                    <FiLogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
