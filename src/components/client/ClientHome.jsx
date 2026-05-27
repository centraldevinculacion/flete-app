import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { db, fmt, STATUS_LABELS } from '../../utils/storage'
import { Stars } from '../shared/StarRating'

const STATUS_COLOR = {
  pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  accepted:  'bg-blue-100 text-blue-700 border-blue-200',
  picking:   'bg-purple-100 text-purple-700 border-purple-200',
  transit:   'bg-indigo-100 text-indigo-700 border-indigo-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
}

export default function ClientHome() {
  const { currentUser, setScreen, setActiveFreightId, dataVersion } = useApp()
  const [activeFreight, setActiveFreight] = useState(null)
  const [recentFreights, setRecentFreights] = useState([])

  useEffect(() => {
    const all = db.freights.getAll()
    const mine = all.filter(f => f.clientId === currentUser.id)
    const active = mine.find(f => ['pending', 'accepted', 'picking', 'transit', 'delivered'].includes(f.status))
    setActiveFreight(active || null)
    const completed = mine.filter(f => f.status === 'completed' || (!active || f.id !== active?.id))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3)
    setRecentFreights(completed)
  }, [dataVersion, currentUser.id])

  // Auto-refresh for status changes
  useEffect(() => {
    const iv = setInterval(() => {
      const all = db.freights.getAll()
      const active = all.find(f => f.clientId === currentUser.id &&
        ['pending','accepted','picking','transit','delivered'].includes(f.status))
      setActiveFreight(active || null)
    }, 3000)
    return () => clearInterval(iv)
  }, [currentUser.id])

  const goToActive = () => {
    if (activeFreight) {
      setActiveFreightId(activeFreight.id)
      setScreen('active-freight')
    }
  }

  const firstName = currentUser.name.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="p-4 space-y-5">
      {/* Greeting */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-blue-200 text-sm font-medium">{greeting},</p>
        <h1 className="text-2xl font-bold mt-0.5">{firstName} 👋</h1>
        {currentUser.ratingCount > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Stars value={currentUser.rating} size={16} />
            <span className="text-blue-100 text-sm">{currentUser.rating} de 5</span>
          </div>
        )}
      </div>

      {/* Active freight */}
      {activeFreight ? (
        <div>
          <h2 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Flete activo</h2>
          <button
            onClick={goToActive}
            className={`w-full rounded-xl border-2 p-4 text-left transition-all shadow-sm hover:shadow-md ${STATUS_COLOR[activeFreight.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold uppercase tracking-wide">
                {STATUS_LABELS[activeFreight.status]}
              </span>
              <ActiveIndicator status={activeFreight.status} />
            </div>
            <div className="text-sm space-y-1">
              <p className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <span className="font-medium truncate">{activeFreight.origin}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-lg">🏁</span>
                <span className="font-medium truncate">{activeFreight.destination}</span>
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-bold text-lg">{fmt.currency(activeFreight.price)}</span>
              <span className="text-sm font-semibold underline">Ver detalles →</span>
            </div>
          </button>
        </div>
      ) : (
        /* Request button */
        <button
          onClick={() => setScreen('request')}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl p-6 shadow-lg transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
              🚛
            </div>
            <div>
              <p className="font-bold text-xl">Solicitar flete</p>
              <p className="text-blue-200 text-sm mt-0.5">Rápido, fácil y seguro</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-blue-100 text-sm">
            <span>📍</span><span>Ingresá origen y destino</span>
          </div>
        </button>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard emoji="📦" label="Fletes totales" value={db.freights.getAll().filter(f => f.clientId === currentUser.id).length} />
        <StatCard emoji="⭐" label="Mi calificación" value={currentUser.ratingCount > 0 ? `${currentUser.rating}/5` : 'Sin datos'} />
      </div>

      {/* Recent history */}
      {recentFreights.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Recientes</h2>
            <button
              onClick={() => setScreen('history')}
              className="text-xs text-blue-600 font-medium"
            >
              Ver todo
            </button>
          </div>
          <div className="space-y-2">
            {recentFreights.map(f => (
              <RecentFreightCard key={f.id} freight={f} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ActiveIndicator({ status }) {
  if (status === 'pending') return <span className="flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />Esperando</span>
  if (status === 'transit') return <span className="flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />En camino</span>
  return <span className="flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />Activo</span>
}

function StatCard({ emoji, label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="text-2xl mb-1">{emoji}</div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-bold text-gray-900 text-lg">{value}</p>
    </div>
  )
}

function RecentFreightCard({ freight: f }) {
  const driver = db.users.find(f.driverId)
  return (
    <div className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
        🚛
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{f.destination}</p>
        <p className="text-xs text-gray-500 truncate">{driver?.name || 'Sin asignar'}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-blue-600">{fmt.currency(f.price)}</p>
        <p className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit' })}</p>
      </div>
    </div>
  )
}
