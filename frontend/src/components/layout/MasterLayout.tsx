import { Outlet } from 'react-router'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import Footer from './Footer'
import { useAlertSocket } from '@/hooks/useAlertSocket'

export default function MasterLayout() {
  // Single app-wide real-time alert connection: raises toasts anywhere and
  // feeds the Dashboard → Notifications tab + the navbar bell.
  useAlertSocket()

  return (
    <div className="flex flex-col h-screen bg-gray-100">

      {/* Navbar — full width across top */}
      <Navbar />

      {/* Middle row — sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Footer — full width across bottom */}
      <Footer />

    </div>
  )
}