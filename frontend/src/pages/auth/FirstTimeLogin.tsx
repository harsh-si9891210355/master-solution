import { useState } from 'react'
import { useNavigate } from 'react-router'

export default function FirstTimeLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', tempPw: '', newPw: '', confirmPw: '' })
  const [show, setShow] = useState({ temp: false, newp: false, confirm: false })
  const [error, setError] = useState('')

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.email || !form.tempPw || !form.newPw || !form.confirmPw) {
      setError('All fields are required.'); return
    }
    if (form.newPw !== form.confirmPw) {
      setError('New passwords do not match.'); return
    }
    navigate('/first-time-login/step2')
  }

  const steps = [
    { n: 1, label: 'Sign up your\nworkspace', active: true  },
    { n: 2, label: 'Sign up your\nprofile',   active: false },
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

            {/* Step cards — visible borders on white background */}
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
        <div className="w-px bg-blue-600 opacity-40 flex-shrink-0" />

        {/* Right — form panel */}
        <div
          className="flex-shrink-0 flex flex-col justify-center px-14 py-16"
          style={{ width: 420, background: 'rgba(251,243,210,0.18)' }}
        >
          {/* Heading */}
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
                Please enter your username &amp; temporary password to complete your account setup.
              </p>
            </div>
             {/* Divider */}
            <div className="border-t border-blue-100 border-opacity-30 mb-5" />

            {error && (
              <div className="mb-4 px-3 py-2 bg-red-500/20 border border-red-400/40 text-red-200 text-xs rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleNext} className="flex flex-col gap-4">
              {/* Email */}
              <input
                type="email" placeholder="username@hcltech.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-5 py-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
              />

              {/* Password fields */}
              {([
                { key: 'tempPw',    showKey: 'temp',    placeholder: 'Enter your temporary password' },
                { key: 'newPw',     showKey: 'newp',    placeholder: 'Enter your new password'       },
                { key: 'confirmPw', showKey: 'confirm', placeholder: 'Confirm your new password'     },
              ] as const).map(({ key, showKey, placeholder }) => (
                <div key={key} className="relative">
                  <input
                    type={show[showKey] ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-5 py-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: '#F9F6EE', border: '1.5px solid #1447e6' }}
                  />
                  <button type="button"
                    onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <span className="material-icons" style={{ fontSize: 20 }}>
                      {show[showKey] ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              ))}

              {/* Buttons */}
              <div className="flex gap-3 mt-1">
                <button type="button" onClick={() => navigate('/')}
                  className="flex-1 py-3 text-sm font-medium text-black"
                  style={{ background: '#D5D5D5' }}>
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-3 text-sm font-medium text-white"
                  style={{ background: '#1447e6' }}>
                  Next
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
