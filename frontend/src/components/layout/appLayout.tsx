import { Outlet, useNavigate } from 'react-router';
import { Sidebar } from 'primereact/sidebar';
import { Button } from 'primereact/button';

export const AppLayout = () => {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Simple Sidebar */}
            <aside className="w-64 bg-white shadow-md p-4 flex flex-col gap-4">
                <h2 className="text-xl font-bold text-blue-600">Master Solution</h2>
                <Button label="Dashboard" icon="pi pi-home" text onClick={() => navigate('/dashboard')} />
                <Button label="Events" icon="pi pi-calendar" text onClick={() => navigate('/events')} />
                <Button label="Cameras" icon="pi pi-video" text onClick={() => navigate('/cameras')} />
                <div className="mt-auto">
                    <Button label="Logout" icon="pi pi-power-off" severity="danger" />
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-8">
                <Outlet /> {/* Child pages like Dashboard render here */}
            </main>
        </div>
    );
};