import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomTabBar } from './BottomTabBar'
import { useClub } from '../../hooks/useClub'

export function AppLayout() {
  const { club } = useClub()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header clubName={club?.club_name} />
        <main className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomTabBar />
    </div>
  )
}
