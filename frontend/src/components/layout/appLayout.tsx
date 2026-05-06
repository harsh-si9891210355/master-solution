import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '@/store/authStore';
import { useNsTranslation } from '@/hooks/Usenstranslation';
import { SUPPORTED_LANGUAGES } from '@/languages/index';

export const AppLayout = () => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const logout    = useAuthStore((s) => s.logout);
    const { t, currentLang, changeLanguage } = useNsTranslation('layout');

    // Nav items use translation keys — labels re-render automatically on language change
    const NAV_ITEMS = [
        { label: t('nav.dashboard'), icon: 'pi pi-home',     path: '/dashboard' },
        { label: t('nav.events'),    icon: 'pi pi-calendar', path: '/events'    },
        { label: t('nav.cameras'),   icon: 'pi pi-video',    path: '/cameras'   },
        { label: t('nav.users'),     icon: 'pi pi-users',    path: '/users'     },
    ];

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* ── Sidebar ───────────────────────────────────────────────── */}
            <aside className="w-20 md:w-64 bg-white shadow-md flex flex-col transition-all duration-300">
                {/* Logo */}
                <div className="p-4 border-b flex items-center gap-3">
                    <span className="text-blue-600 text-2xl pi pi-shield" />
                    <span className="hidden md:block text-lg font-bold text-blue-600 truncate">
                        {t('app_name')}
                    </span>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-2 flex flex-col gap-1 mt-2">
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg w-full text-left transition-colors
                                    ${isActive
                                        ? 'bg-blue-50 text-blue-600 font-semibold'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                <i className={`${item.icon} text-lg`} />
                                <span className="hidden md:block text-sm">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-2 border-t">
                    <button
                        onClick={() => { logout(); navigate('/'); }}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg w-full text-left text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <i className="pi pi-power-off text-lg" />
                        <span className="hidden md:block text-sm font-medium">
                            {t('logout')}
                        </span>
                    </button>
                </div>
            </aside>

            {/* ── Main area ─────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

                {/* Top header with language toggle */}
                <header className="bg-white border-b shadow-sm px-6 py-3 flex items-center justify-end">
                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => changeLanguage(lang.code)}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold
                                    transition-all duration-150
                                    ${currentLang === lang.code
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:bg-gray-200'
                                    }
                                `}
                            >
                                <span>{lang.flag}</span>
                                <span>{lang.code.toUpperCase()}</span>
                            </button>
                        ))}
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};