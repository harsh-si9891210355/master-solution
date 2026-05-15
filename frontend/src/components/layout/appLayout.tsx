import { Outlet, useNavigate, useLocation } from "react-router";
import { useAuthStore } from "@/store/authStore";
import { useNsTranslation } from "@/hooks/Usetranslation";
import { SUPPORTED_LANGUAGES } from "@/languages/index";
import { FormButton } from "../ui/FormButton";

export const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const { t, currentLang, changeLanguage } = useNsTranslation("layout");

  const NAV_ITEMS = [
    { label: t("nav.dashboard"), icon: "pi pi-home", path: "/dashboard" },
    { label: t("nav.events"), icon: "pi pi-calendar", path: "/events" },
    { label: t("nav.cameras"), icon: "pi pi-video", path: "/cameras" },
    { label: t("nav.users"), icon: "pi pi-users", path: "/users" },
  ];

  return (
    <div className="app-layout">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon">
            <i className="pi pi-shield" />
          </div>
          <span className="sidebar__logo-name">{t("app_name")}</span>
        </div>

        {/* Nav items */}
        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <FormButton
                key={item.path}
                label={item.label}
                iconLeft={item.icon}
                variant="ghost"
                className={`sidebar__nav-btn ${isActive ? "sidebar__nav-btn--active" : ""}`}
                onClick={() => navigate(item.path)}
              />
            );
          })}
        </nav>

        {/* Logout */}
        <div className="sidebar__footer">
          <FormButton
            label={t("logout")}
            iconLeft="pi pi-power-off"
            variant="ghost"
            className="sidebar__logout-btn"
            onClick={() => {
              logout();
              navigate("/");
            }}
          />
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <div className="main-area">
        {/* Header */}
        <header className="app-header">
          <div className="app-header__lang-switcher">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <FormButton
                key={lang.code}
                type="button"
                label={`${lang.flag} ${lang.code.toUpperCase()}`}
                variant="ghost"
                className={`app-header__lang-btn ${currentLang === lang.code ? "app-header__lang-btn--active" : ""}`}
                onClick={() => changeLanguage(lang.code)}
              />
            ))}
          </div>
        </header>

        {/* Page content */}
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
