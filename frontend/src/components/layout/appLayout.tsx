import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '@/store/authStore';
import { useNsTranslation } from '@/hooks/Usetranslation';
import { SUPPORTED_LANGUAGES } from '@/languages/index';

export const AppLayout = () => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const logout    = useAuthStore((s) => s.logout);
    const { t, currentLang, changeLanguage } = useNsTranslation('layout');

    const NAV_ITEMS = [
        { label: t('nav.dashboard'), icon: 'pi pi-home',     path: '/dashboard' },
        { label: t('nav.events'),    icon: 'pi pi-calendar', path: '/events'    },
        { label: t('nav.cameras'),   icon: 'pi pi-video',    path: '/cameras'   },
        { label: t('nav.users'),     icon: 'pi pi-users',    path: '/users'     },
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
                    <span className="sidebar__logo-name">{t('app_name')}</span>
                </div>

                {/* Nav items */}
                <nav className="sidebar__nav">
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`sidebar__nav-btn ${isActive ? 'sidebar__nav-btn--active' : ''}`}
                            >
                                <i className={item.icon} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="sidebar__footer">
                    <button
                        className="sidebar__logout-btn"
                        onClick={() => { logout(); navigate('/'); }}
                    >
                        <i className="pi pi-power-off" />
                        <span>{t('logout')}</span>
                    </button>
                </div>
            </aside>

            {/* ── Main area ─────────────────────────────────────────────────── */}
            <div className="main-area">

                {/* Header */}
                <header className="app-header">
                    <div className="app-header__lang-switcher">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => changeLanguage(lang.code)}
                                className={`app-header__lang-btn ${currentLang === lang.code ? 'app-header__lang-btn--active' : ''}`}
                            >
                                <span>{lang.flag}</span>
                                <span>{lang.code.toUpperCase()}</span>
                            </button>
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