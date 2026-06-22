import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { onboardingService } from './api/onboardingService'
import { useToast } from '@/components/ui/ToastProvider'

const COUNTRY_CODES = ['+91', '+1', '+44', '+61', '+65', '+971']
const CITIES  = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune']
const STATES  = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Delhi', 'Gujarat']

export default function FirstTimeLoginStep2() {
  const navigate = useNavigate()
  const toast = useToast()
  const token = sessionStorage.getItem('onboarding_token')

  const [form, setForm] = useState({
    firstName: '', lastName: '', department: '',
    countryCode: '+91', phone: '', city: '', state: '', country: 'INDIA',
  })
  const [error, setError] = useState('')
  // Set once the profile is saved, so removing the token below doesn't make the
  // guard bounce us back to step 1 before navigate('/') takes effect.
  const [completed, setCompleted] = useState(false)

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      onboardingService.completeProfile({
        token: token ?? '',
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        department: form.department.trim() || undefined,
        country_code: form.countryCode,
        mobile_number: form.phone.trim() || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country.trim() || undefined,
      }),
    onSuccess: () => {
      setCompleted(true)
      sessionStorage.removeItem('onboarding_token')
      sessionStorage.removeItem('onboarding_email')
      toast.success('Profile completed', 'Your account is active. Please sign in.')
      navigate('/', { replace: true })
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Could not save your profile. Please try again.'
      setError(msg)
      toast.error('Could not complete profile', msg)
    },
  })

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required.'); return
    }
    if (form.phone.trim() && !/^[0-9]{7,15}$/.test(form.phone.trim())) {
      setError('Enter a valid mobile number (7–15 digits).'); return
    }
    save()
  }

  // Must come from step 1 (which stores the short-lived token). After a
  // successful save we clear the token, so skip this once completed.
  if (!token && !completed) {
    return <Navigate to="/first-time-login" replace />
  }

  const steps = [
    { n: 1, label: 'Sign up your\nworkspace', active: false },
    { n: 2, label: 'Sign up your\nprofile',   active: true  },
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
                Please enter your details to complete your account setup.
              </p>
            </div>

            <div className="border-t border-blue-100 border-opacity-30 mb-5" />

            {error && (
              <div className="mb-4 px-4 py-2 bg-red-50 border border-red-300 text-red-600 text-xs rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="flex flex-col gap-4">

              {/* Text fields */}
              {([
                { key: 'firstName',  placeholder: 'First Name'  },
                { key: 'lastName',   placeholder: 'Last Name'   },
                { key: 'department', placeholder: 'Department'  },
              ] as const).map(({ key, placeholder }) => (
                <input key={key}
                  type="text" placeholder={placeholder}
                  value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-5 py-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
                />
              ))}

              {/* Phone */}
              <div className="flex gap-2">
                <select value={form.countryCode}
                  onChange={e => setForm(f => ({ ...f, countryCode: e.target.value }))}
                  className="px-5 py-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24 flex-shrink-0"
                  style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}>
                  {COUNTRY_CODES.map(c => <option key={c}>{c}</option>)}
                </select>
                <input type="tel" placeholder="0000000000"
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="flex-1 px-5 py-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
                />
              </div>

              {/* City / State */}
              <div className="flex gap-2">
                <select value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className="flex-1 px-5 py-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}>
                  <option value="">City</option>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                  className="flex-1 px-5 py-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}>
                  <option value="">State</option>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Country */}
              <input type="text" placeholder="Country" value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                className="w-full px-5 py-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
              />

              {/* Buttons */}
              <div className="flex gap-3 mt-1">
                <button type="button" onClick={() => navigate('/first-time-login')}
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
