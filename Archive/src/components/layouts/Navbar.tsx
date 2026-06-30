import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()

  function handleLogout() {
    // Clear any auth state here (localStorage, context, etc.)
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">

      {/* Left — page brand */}
      <h1 className="text-sm font-semibold text-gray-700">AIVMS</h1>

      {/* Right — user info + logout */}
      <div className="flex items-center gap-4">

        {/* Avatar + name */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm">
            A
          </div>
          <span className="text-sm text-gray-600 font-medium">Admin</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200" />

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          Logout
        </button>

      </div>
    </header>
  )
}