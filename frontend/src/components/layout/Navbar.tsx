import { useAuth0 } from '@auth0/auth0-react'
import { useAuthStore } from '@/store/authStore'

export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  const { user: auth0User } = useAuth0()

  const firstName = user?.first_name ?? ''
  const lastName = user?.last_name ?? ''
  const fullName =
    `${firstName} ${lastName}`.trim() ||
    auth0User?.name ||
    user?.email ||
    auth0User?.email ||
    'User'
  const picture = auth0User?.picture
  const initial = (firstName || fullName).charAt(0).toUpperCase()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">

      {/* Left — page brand */}
      <h1 className="text-sm font-semibold text-gray-700">Master Solution</h1>

      {/* Right — user info */}
      <div className="flex items-center gap-4">

        {/* Avatar + name */}
        <div className="flex items-center gap-2">
          {picture ? (
            <img
              src={picture}
              alt={fullName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm">
              {initial}
            </div>
          )}
          <span className="text-sm text-gray-600 font-medium">{fullName}</span>
        </div>

      </div>
    </header>
  )
}
