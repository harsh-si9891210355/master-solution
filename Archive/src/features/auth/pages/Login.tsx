import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msLoading, setMsLoading] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.email || !form.password) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      if (form.email === 'admin@aivms.com' && form.password === 'password') {
        navigate('/')
      } else {
        setError('Invalid username or password.')
      }
    }, 900)
  }

  function handleMicrosoftLogin() {
    setMsLoading(true)
    // Replace with real MSAL / Azure AD redirect
    setTimeout(() => {
      setMsLoading(false)
      navigate('/')
    }, 1200)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFFFF' }}>

      {/* ── Main content ── */}
      <div className="flex flex-1">

        {/* Left — white panel */}
        <div
          className="flex-1 relative"
          style={{
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 20%, rgba(0,0,0,0.06) 0%, transparent 50%),
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.015) 2px,
                rgba(0,0,0,0.015) 4px
              ),
              #FFFFFF
            `,
          }}
        />

        {/* Vertical divider */}
        <div className="w-px bg-blue-600 opacity-40" />

        {/* Right — form panel */}
        <div
          className="flex flex-col justify-center px-14 py-16"
          style={{ width: 420, background: 'rgba(251,243,210,0.18)' }}
        >
          {/* Heading */}
          <div className="mb-8">
            <p className="text-lg font-normal text-gray-800 mb-1">Welcome to</p>
            <p className="text-lg font-bold text-gray-800 leading-snug">
              <span className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
                AI based VIDEO MANAGEMENT SYSTEM
              </span>
            </p>
            <p className="text-xs text-gray-600 mt-4 leading-relaxed">
              Please enter your username &amp; password to sign in.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-blue-100 border-opacity-30 mb-4" />

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-300 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email */}
            <input
              type="email"
              placeholder="username@aivms.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-5 py-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
            />

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-5 py-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end -mt-1">
              <a href="#" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">
                Forget Password?
              </a>
            </div>

            {/* Log In button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-sm font-medium text-white transition-opacity disabled:opacity-70 mt-2"
              style={{ background: '#1a2332' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Log In'
              )}
            </button>

          </form>

          {/* ── OR divider ── */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Microsoft Login button ── */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={msLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 border border-gray-300 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60 text-sm font-medium text-gray-700"
          >
            {msLoading ? (
              <svg className="animate-spin w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              /* Official Microsoft logo — 4 coloured squares */
              <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
            )}
            {msLoading ? 'Redirecting to Microsoft…' : 'Sign in with Microsoft'}
          </button>

          {/* First-time User */}
          <div className="mt-5 " style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="px-4 py-3">
              <p className="text-xs text-black-200 mb-3 leading-relaxed">
                If you are a first time user logging into the application there are certain tasks
                that you need to fulfill before being able to access the application.
              </p>
            </div>
            <button
              onClick={() => navigate('/first-time-login')}
              className="w-full flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors"
              style={{ background: '#1447e6', color: '#ffffff' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0f37c0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#1447e6')}>
              <span className="material-icons" style={{ fontSize: 18, color: '#fff' }}>person</span>
              First Time Login
            </button>
          </div>

          {/* Demo hint */}
          <p className="mt-4 text-xs text-yellow-800 opacity-70">
            Demo: admin@aivms.com / password
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        className="px-8 py-3 border-t border-blue-600 border-opacity-30"
        style={{ background: 'rgba(0,0,0,0.06)' }}
      >
        <p className="text-xs text-gray-700">
          Copyright © {new Date().getFullYear()}{' '}
          <strong>HCLTECH</strong> and its related entities. All Rights Reserved.
        </p>
      </div>

    </div>
  )
}