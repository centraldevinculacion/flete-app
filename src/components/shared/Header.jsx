import { useApp } from '../../context/AppContext'

function Avatar({ name, size = 8 }) {
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?'
  return (
    <div className={`w-${size} h-${size} rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm`}>
      {initials}
    </div>
  )
}

const ROLE_BADGE = {
  client: { label: 'Cliente', bg: 'bg-green-100', text: 'text-green-700' },
  driver: { label: 'Transportista', bg: 'bg-orange-100', text: 'text-orange-700' },
}

export default function Header() {
  const { currentUser } = useApp()
  if (!currentUser) return null

  const badge = ROLE_BADGE[currentUser.role]

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0 z-10">
      <div className="flex items-center gap-2">
        <span className="text-xl">🚛</span>
        <span className="font-bold text-blue-600 text-lg tracking-tight">FleteApp</span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900 leading-tight">{currentUser.name}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>
        <Avatar name={currentUser.name} />
      </div>
    </header>
  )
}
