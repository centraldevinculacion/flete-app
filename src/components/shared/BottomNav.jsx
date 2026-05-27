import { useApp } from '../../context/AppContext'

const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
)
const IconHistory = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
  </svg>
)
const IconProfile = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
)
const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z"/>
  </svg>
)
const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
  </svg>
)

const TABS = [
  { id: 'home',    label: 'Inicio',    Icon: IconHome },
  { id: 'history', label: 'Historial', Icon: IconHistory },
  { id: 'profile', label: 'Perfil',    Icon: IconProfile },
  { id: 'chat',    label: 'Chat',      Icon: IconChat },
  { id: 'logout',  label: 'Salir',     Icon: IconLogout },
]

const DRIVER_SCREENS = ['home', 'request-detail', 'active-freight']
const CLIENT_SCREENS = ['home', 'request', 'active-freight']

export default function BottomNav() {
  const { currentUser, screen, setScreen, logout } = useApp()
  if (!currentUser) return null

  const homeScreens = currentUser.role === 'client' ? CLIENT_SCREENS : DRIVER_SCREENS

  const handleTab = (id) => {
    if (id === 'logout') { logout(); return }
    setScreen(id)
  }

  const isActive = (id) => {
    if (id === 'home') return homeScreens.includes(screen)
    return screen === id
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 flex items-stretch z-20 shadow-lg">
      {TABS.map(({ id, label, Icon }) => {
        const active = isActive(id)
        const isLogout = id === 'logout'
        return (
          <button
            key={id}
            onClick={() => handleTab(id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors
              ${isLogout ? 'text-red-400 hover:text-red-500 hover:bg-red-50' :
                active ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Icon />
            <span className={`text-[10px] font-medium ${active && !isLogout ? 'text-blue-600' : ''}`}>
              {label}
            </span>
            {active && !isLogout && (
              <div className="absolute bottom-0 w-1 h-1 bg-blue-600 rounded-full" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
