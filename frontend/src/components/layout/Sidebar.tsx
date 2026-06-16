
import { useNavigate, useLocation } from 'react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNsTranslation } from "@/hooks/Usetranslation";
import { DeleteModalPopup } from '@/components/ui/DeleteModalPopup';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';


export default function Sidebar() {
  const { t, currentLang, changeLanguage } = useNsTranslation("layout");
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const logout = useAuthStore((s) => s.logout)
  const permissions = useAuthStore((s) => s.permissions)
  const queryClient = useQueryClient()
  const { isAuthenticated, logout: auth0Logout } = useAuth0()

  const handleLogout = () => {
    DeleteModalPopup.showLogout({
      message: t('logout_confirm_message'),
      header: t('logout_confirm_header'),
      acceptLabel: t('logout_ok'),
      rejectLabel: t('logout_cancel'),
      onConfirm: () => {
        logout()
        queryClient.clear() // drop cached data from the previous session
        // If signed in via Auth0, end the Auth0 session too; otherwise just
        // return to the local login page.
        if (isAuthenticated) {
          auth0Logout({ logoutParams: { returnTo: window.location.origin } })
        } else {
          navigate('/')
        }
      }
    })
  }

  // Each item is gated by the permission its page needs; items the user lacks
  // permission for are hidden. (undefined = always visible.)
  const NAV_ITEMS: { label: string; icon: string; path: string; permission?: string }[] = [
    { label: t("nav.dashboard"), icon: "dashboard", path: "/dashboard" },
    { label: t("nav.events"), icon: "table_rows", path: "/events", permission: "event:read" },
    { label: t("nav.cameras"), icon: "nest_cam_outdoor", path: "/cameras", permission: "camera:read" },
    { label: t("nav.usecases"), icon: "lab_profile", path: "/usecases", permission: "usecase:read" },
    { label: t("nav.users"), icon: "group", path: "/users", permission: "user:read" },
    { label: t("nav.settings"), icon: "desktop_windows", path: "/settings" },
  ];

  const visibleNavItems = NAV_ITEMS.filter((item) => hasPermission(permissions, item.permission));

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
        {visibleNavItems.map(({ path, label, icon }) => {
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
          onClick={handleLogout}
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

      <DeleteModalPopup.LogoutHost />
    </aside>
  )
}