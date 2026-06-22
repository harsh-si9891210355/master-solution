import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useNsTranslation } from '@/hooks/Usetranslation'
import { DeleteModalPopup } from '@/components/ui/DeleteModalPopup'

export default function Navbar() {
  const navigate = useNavigate()
  const { t } = useNsTranslation('layout')
  const queryClient = useQueryClient()
  const { isAuthenticated, logout: auth0Logout } = useAuth0()

  const user = useAuthStore((s) => s.user)
  const avatar = useAuthStore((s) => s.avatar)
  const storeLogout = useAuthStore((s) => s.logout)

  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

      {/* Right — profile dropdown */}
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

      <DeleteModalPopup.LogoutHost />
    </header>
  )
}
