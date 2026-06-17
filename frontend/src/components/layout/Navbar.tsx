import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useAuthStore } from '@/store/authStore'

export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  const { user: auth0User } = useAuth0()
  const [imgLoaded, setImgLoaded] = useState(false)

  const firstName = user?.first_name ?? ''
  const lastName = user?.last_name ?? ''
  const fullName =
    `${firstName} ${lastName}`.trim() ||
    auth0User?.name ||
    user?.email ||
    auth0User?.email ||
    'User'
  const roleName = user?.role_name ?? ''
  const picture = auth0User?.picture
  const initial = (firstName || fullName).charAt(0).toUpperCase()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">

      {/* Left — page brand */}
      <h1 className="text-sm font-semibold text-gray-700">Master Solution</h1>

      {/* Right — user info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {/* Avatar — initial shows instantly; the remote image fades in once
              loaded so a slow/missing picture never blocks the UI. */}
          <div className="relative w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm overflow-hidden">
            <span>{initial}</span>
            {picture && (
              <img
                src={picture}
                alt=""
                referrerPolicy="no-referrer"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(false)}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
                style={{ opacity: imgLoaded ? 1 : 0 }}
              />
            )}
          </div>

          {/* Name + role */}
          <div className="flex flex-col leading-tight">
            <span className="text-sm text-gray-700 font-medium">{fullName}</span>
            {roleName && (
              <span className="text-xs text-gray-400">{roleName}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
