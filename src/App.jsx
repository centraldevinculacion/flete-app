import { useApp } from './context/AppContext'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import Header from './components/shared/Header'
import BottomNav from './components/shared/BottomNav'
import ClientHome from './components/client/ClientHome'
import RequestFreight from './components/client/RequestFreight'
import ClientActiveFreight from './components/client/ClientActiveFreight'
import DriverHome from './components/driver/DriverHome'
import RequestDetail from './components/driver/RequestDetail'
import DriverActiveFreight from './components/driver/DriverActiveFreight'
import History from './components/shared/History'
import Profile from './components/shared/Profile'
import Chat from './components/shared/Chat'

function AppContent() {
  const { currentUser, screen } = useApp()

  if (!currentUser) {
    if (screen === 'register') return <Register />
    return <Login />
  }

  const isClient = currentUser.role === 'client'

  const renderScreen = () => {
    switch (screen) {
      case 'history':  return <History />
      case 'profile':  return <Profile />
      case 'chat':     return <Chat />
      default:
        if (isClient) {
          switch (screen) {
            case 'request':        return <RequestFreight />
            case 'active-freight': return <ClientActiveFreight />
            default:               return <ClientHome />
          }
        } else {
          switch (screen) {
            case 'request-detail': return <RequestDetail />
            case 'active-freight': return <DriverActiveFreight />
            default:               return <DriverHome />
          }
        }
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-[430px] mx-auto shadow-2xl relative overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
        {renderScreen()}
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-200">
      <AppContent />
    </div>
  )
}
