import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useAlertStore } from '@/store/alertStore'
import { useNsTranslation } from '@/hooks/Usetranslation'
import { DeleteModalPopup } from '@/components/ui/DeleteModalPopup'
import { SEVERITY_COLOR, formatTime } from '@/pages/dashboard/notifications/constants'

export default function Navbar() {
  const navigate = useNavigate()
  const { t } = useNsTranslation('layout')
  const queryClient = useQueryClient()
  const { isAuthenticated, logout: auth0Logout } = useAuth0()

  const user = useAuthStore((s) => s.user)
  const avatar = useAuthStore((s) => s.avatar)
  const storeLogout = useAuthStore((s) => s.logout)

  const unreadCount = useAlertStore((s) => s.unreadCount)
  const isConnected = useAlertStore((s) => s.isConnected)
  const markAllRead = useAlertStore((s) => s.markAllRead)
  const alerts = useAlertStore((s) => s.alerts)

  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  // Clicking the bell now opens a quick-view popover instead of jumping away
  // (and silently marking everything read). Users mark read or "view all" on purpose.
  const handleBellClick = () => setBellOpen((o) => !o)

  const goToAlerts = (markRead = true) => {
    if (markRead) markAllRead()
    setBellOpen(false)
    navigate('/dashboard?tab=notifications&view=alerts')
  }

  const recentAlerts = alerts.slice(0, 6)

  const firstName = user?.first_name ?? ''
  const lastName = user?.last_name ?? ''
  const fullName = `${firstName} ${lastName}`.trim() || user?.email || 'User'
  const roleName = user?.role_name ?? ''
  const initial = (firstName || fullName).charAt(0).toUpperCase()

  // Close the dropdown when clicking outside.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Close the bell popover when clicking outside.
  useEffect(() => {
    if (!bellOpen) return
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [bellOpen])

  const handleEditProfile = () => {
    setOpen(false)
    navigate('/profile')
  }

  const handleLogout = () => {
    setOpen(false)
    DeleteModalPopup.showLogout({
      message: t('logout_confirm_message'),
      header: t('logout_confirm_header'),
      acceptLabel: t('logout_ok'),
      rejectLabel: t('logout_cancel'),
      onConfirm: () => {
        storeLogout()
        queryClient.clear()
        if (isAuthenticated) {
          auth0Logout({ logoutParams: { returnTo: window.location.origin } })
        } else {
          navigate('/')
        }
      },
    })
  }

  const Avatar = ({ size = 32, font = 13 }: { size?: number; font?: number }) =>
    avatar ? (
      <img src={avatar} alt={fullName} className="rounded-full object-cover" style={{ width: size, height: size }} />
    ) : (
      <div className="user-avatar" style={{ width: size, height: size, fontSize: font }}>{initial}</div>
    )

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left — page brand */}
      <h1 className="text-sm font-semibold text-gray-700">Master Solution</h1>

      {/* Right — notification bell + profile dropdown */}
      <div className="flex items-center gap-3">
        <div className="relative" ref={bellRef}>
        <button
          type="button"
          onClick={handleBellClick}
          className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-50 transition-colors"
          title={isConnected ? 'Notifications (live)' : 'Notifications (reconnecting…)'}
          aria-label="Notifications"
        >
          <i className="pi pi-bell text-lg text-gray-600" />
          <span
            className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-white"
            style={{ background: isConnected ? '#34D399' : '#9CA3AF' }}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Quick-view popover — peek at recent alerts without leaving the page. */}
        {bellOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                    {unreadCount > 99 ? '99+' : unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium text-cyan-600 hover:text-cyan-700"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {recentAlerts.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">You're all caught up.</p>
              ) : (
                recentAlerts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => goToAlerts()}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <span
                      className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ background: SEVERITY_COLOR[a.severity] }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-700">{a.title}</span>
                      <span className="block text-xs text-gray-400">
                        {a.location_name} · {formatTime(a.event_start_time)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => goToAlerts()}
              className="w-full border-t border-gray-100 px-4 py-2.5 text-center text-sm font-medium text-cyan-600 hover:bg-cyan-50"
            >
              View all alerts
            </button>
          </div>
        )}
        </div>

        <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <Avatar />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-sm text-gray-700 font-medium">{fullName}</span>
            {roleName && <span className="text-xs text-gray-400">{roleName}</span>}
          </div>
          <i className={`pi pi-chevron-down text-xs text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
            {/* User summary */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <Avatar size={40} font={15} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{fullName}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEditProfile}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <i className="pi pi-user-edit text-gray-400" />
              {t('profile.edit', { defaultValue: 'Edit Profile' })}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            >
              <i className="pi pi-sign-out" />
              {t('logout', { defaultValue: 'Logout' })}
            </button>
          </div>
        )}
        </div>
      </div>

      <DeleteModalPopup.LogoutHost />
    </header>
  )
}
