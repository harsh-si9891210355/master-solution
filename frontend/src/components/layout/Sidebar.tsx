
import { useNavigate, useLocation } from 'react-router'
import { useNsTranslation } from "@/hooks/Usetranslation";


export default function Sidebar() {
  const { t, currentLang, changeLanguage } = useNsTranslation("layout");
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const NAV_ITEMS = [
    { label: t("nav.dashboard"), icon: "dashboard", path: "/dashboard" },
    { label: t("nav.events"), icon: "table_rows", path: "/events" },
    { label: t("nav.cameras"), icon: "nest_cam_outdoor", path: "/cameras" },
    { label: t("nav.usecases"), icon: "lab_profile", path: "/usecases" },
    { label: t("nav.users"), icon: "group", path: "/users" },
    { label: t("nav.settings"), icon: "desktop_windows", path: "/settings" },
  ];

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
          // const active = isActive(path)
          const isActive = location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              title={label}
              className="relative group flex items-center justify-center w-full transition-all duration-150"
              style={{
                height: 56,
                background: isActive ? '#003087' : '#ffffff',
                color: isActive ? '#ffffff' : '#003087',
                borderLeft: isActive ? '3px solid #4f83f7' : '3px solid transparent',
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
            ; (e.currentTarget as HTMLButtonElement).style.background = '#fff1f2'
              ; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'
          }}
          onMouseLeave={e => {
            ; (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'
              ; (e.currentTarget as HTMLButtonElement).style.color = '#003087'
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