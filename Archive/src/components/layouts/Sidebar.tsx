import { useNavigate, useLocation } from 'react-router-dom'


const NAV_ITEMS = [
  { path: '/',         label: 'Dashboard',           icon: 'dashboard'       },
  { path: '/cameras',  label: 'Camera Management',   icon: 'nest_cam_outdoor'},
  { path: '/events',   label: 'Event Management',    icon: 'table_rows'      },  
  { path: '/reports',  label: 'Use Case Management', icon: 'lab_profile'     },
  { path: '/users',    label: 'User Management',     icon: 'group'           },  
  { path: '/settings', label: 'Settings',            icon: 'desktop_windows' },
]

export default function Sidebar() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)

  return (
    <aside
      className="flex flex-col flex-shrink-0 h-full"
      style={{
        width: 56,
        background: '#ffffff',
        borderRight: '1px solid #e5e7eb',
      }}
    >
      {/* ── Navigation items ── */}
      <nav className="flex flex-col flex-1">
        {NAV_ITEMS.map(({ path, label, icon }) => {
          const active = isActive(path)
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              title={label}
              className="relative group flex items-center justify-center w-full transition-all duration-150"
              style={{
                height:       56,
                background:   active ? '#003087' : '#ffffff',
                color:        active ? '#ffffff' : '#003087',
                borderLeft:   active ? '3px solid #4f83f7' : '3px solid transparent',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              {/* Google Material Icon — update name in NAV_ITEMS above */}
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 22, lineHeight: 1 }}
              >
                {icon}
              </span>

              {/* Tooltip — appears to the right on hover */}
              <span
                className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded text-xs font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-md"
                style={{ background: '#1a2332' }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ── Logout — pinned to bottom ── */}
      <div style={{ borderTop: '1px solid #e5e7eb' }}>
        <button
          onClick={() => navigate('/login')}
          title="Logout"
          className="relative group flex items-center justify-center w-full transition-all duration-150"
          style={{ height: 56, color: '#003087', background: '#ffffff' }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#fff1f2'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#ef4444'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#ffffff'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#003087'
          }}
        >
          {/* Change 'logout' to any Google icon name */}
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 22, lineHeight: 1 }}
          >
            logout
          </span>

          {/* Tooltip */}
          <span
            className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded text-xs font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-md"
            style={{ background: '#1a2332' }}
          >
            Logout
          </span>
        </button>
      </div>

    </aside>
  )
}