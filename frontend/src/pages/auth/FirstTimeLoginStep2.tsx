import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/ToastProvider'
import { authService } from './api/authService'

export default function FirstTimeLoginStep2() {
  const navigate = useNavigate()
  const toast = useToast()
  const { isAuthenticated, logout: auth0Logout } = useAuth0()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const storeLogout = useAuthStore((s) => s.logout)

  // Auth0 often seeds first/last name with the email for password-only users —
  // don't prefill those (they'd be wrong); start blank so the user types them.
  const nameOrBlank = (v?: string) => (v && !v.includes('@') ? v : '')
  const [form, setForm] = useState({
    firstName: nameOrBlank(user?.first_name),
    lastName: nameOrBlank(user?.last_name),
    mobile: user?.mobile_number ?? '',
  })
  const [error, setError] = useState('')

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      authService.completeProfile({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        mobile_number: form.mobile.trim(),
      }),
    onSuccess: (res) => {
      // Persist the updated user (profile_completed is now true) so the route
      // guard lets the user into the app.
      setAuth(token ?? '', res.data.user, res.data.permissions)
      toast.success('Profile completed', 'Your account setup is complete.')
      navigate('/dashboard', { replace: true })
    },
    onError: (err: any) => {
      const data = err?.response?.data
      const msg =
        data?.detail ||
        data?.errors?.[0]?.message ||
        data?.message ||
        err?.message ||
        'Could not save your details.'
      setError(msg)
      toast.error('Save failed', msg)
    },
  })

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required.')
      return
    }
    const mobile = form.mobile.trim()
    if (!/^[0-9]{7,15}$/.test(mobile)) {
      setError('Enter a valid mobile number (7–15 digits).')
      return
    }
    save()
  }

  function handleCancel() {
    storeLogout()
    if (isAuthenticated) {
      auth0Logout({ logoutParams: { returnTo: window.location.origin } })
    } else {
      navigate('/')
    }
  }

  // This page requires an authenticated session (it saves the signed-in user's
  // profile). If somehow reached while logged out, go to login.
  if (!token && !isAuthenticated) {
    return <Navigate to="/" replace />
  }

  // Already onboarded — don't show the profile step again.
  if (user?.profile_completed === true) {
    return <Navigate to="/dashboard" replace />
  }

  const steps = [
    { n: 1, label: 'Set your\npassword', active: false },
    { n: 2, label: 'Complete your\nprofile', active: true },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFFFF' }}>

      {/* ── Main content ── */}
      <div className="flex flex-1">

        {/* Left — white panel */}
        <div
          className="flex-1 relative flex flex-col justify-end"
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
          }}>

          <div className="relative z-10 px-16 pb-16">
            <h1 className="text-5xl font-black text-gray-800 leading-tight mb-3 tracking-tight">
              Get Started
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-snug">
              Complete these easy steps<br />to setup your account.
            </p>

            {/* Step cards */}
            <div className="flex gap-0 border border-blue-100" style={{ maxWidth: 420 }}>
              {steps.map(({ n, label, active }) => (
                <div key={n}
                  className="flex-1 border border-blue-100 px-5 py-6 min-h-[140px] flex flex-col justify-between"
                  style={{ background: active ? '#F9F6EE' : 'transparent' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm"
                    style={{
                      background: active ? '#1447e6' : 'transparent',
                      color:      active ? '#fff' : 'rgba(0,0,0,0.6)',
                      border:     active ? 'none' : '2px solid rgba(0,0,0,0.08)',
                    }}>
                    {n}
                  </div>
                  <p className="text-gray-800 font-bold text-base leading-snug whitespace-pre-line">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="w-px bg-blue-600 opacity-40 flex-shrink-0" />

        {/* Right — form panel */}
        <div
          className="flex-shrink-0 flex flex-col justify-center px-14 py-16"
          style={{ width: 420, background: 'rgba(251,243,210,0.18)' }}
        >
          <div className="relative z-10">
            {/* Heading */}
            <div className="mb-8">
              <p className="text-lg font-normal text-gray-800 mb-1">Welcome to</p>
              <p className="text-lg font-bold text-gray-800 leading-snug">
                <span className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
                  AI based VIDEO MANAGEMENT SYSTEM
                </span>
              </p>
              <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                Please confirm your details to complete your account setup.
              </p>
            </div>

            <div className="border-t border-blue-100 border-opacity-30 mb-5" />

            {error && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-300 text-red-600 text-xs rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700">First Name</label>
                <input
                  type="text" placeholder="First Name"
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full px-5 py-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700">Last Name</label>
                <input
                  type="text" placeholder="Last Name"
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full px-5 py-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700">Mobile Number</label>
                <input
                  type="tel" inputMode="numeric" placeholder="e.g. 9876543210"
                  value={form.mobile}
                  onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                  className="w-full px-5 py-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-1">
                <button type="button" onClick={handleCancel}
                  className="flex-1 py-3 text-sm font-medium text-black"
                  style={{ background: '#D5D5D5' }}>
                  Cancel
                </button>
                <button type="submit"
                  disabled={isPending}
                  className="flex-1 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-70"
                  style={{ background: '#1447e6' }}>
                  {isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
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
