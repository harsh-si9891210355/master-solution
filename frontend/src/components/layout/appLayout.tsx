import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '@/store/authStore';

const NAV_ITEMS = [
    { label: 'Dashboard', icon: 'pi pi-home',     path: '/dashboard' },
    { label: 'Events',    icon: 'pi pi-calendar', path: '/events'    },
    { label: 'Cameras',   icon: 'pi pi-video',    path: '/cameras'   },
    { label: 'Users',     icon: 'pi pi-users',    path: '/users'     },
];

export const AppLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const logout   = useAuthStore((s) => s.logout); // adjust if your store uses a different action name

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-20 md:w-64 bg-white shadow-md flex flex-col transition-all duration-300">
                {/* Logo */}
                <div className="p-4 border-b flex items-center gap-3">
                    <span className="text-blue-600 text-2xl pi pi-shield" />
                    <span className="hidden md:block text-lg font-bold text-blue-600 truncate">
                        Master Solution
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
                        onClick={() => {
                            logout();
                            navigate('/');
                        }}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg w-full text-left text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <i className="pi pi-power-off text-lg" />
                        <span className="hidden md:block text-sm font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
};