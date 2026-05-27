import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { db, fmt, STATUS_LABELS } from '../../utils/storage'
import { Stars } from '../shared/StarRating'

export default function DriverHome() {
  const { currentUser, toggleOnline, setScreen, setSelectedRequestId, setActiveFreightId, dataVersion } = useApp()
  const [pendingFreights, setPendingFreights] = useState([])
  const [activeFreight, setActiveFreight] = useState(null)

  const loadData = () => {
    const all = db.freights.getAll()
    const active = all.find(f => f.driverId === currentUser.id &&
      ['accepted','picking','transit','delivered'].includes(f.status))
    setActiveFreight(active || null)
    if (!active) {
      const pending = all.filter(f => f.status === 'pending')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setPendingFreights(pending)
    }
  }

  useEffect(loadData, [dataVersion, currentUser.id])
  useEffect(() => {
    const iv = setInterval(loadData, 3000)
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

  // Re-read current online state fresh
  const freshUser = db.users.find(currentUser.id) || currentUser
  const isOnline = freshUser.online

  return (
    <div className="p-4 space-y-5">
      {/* Greeting + toggle */}
      <div className={`rounded-2xl p-5 shadow-lg ${isOnline ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-gray-600 to-gray-700'} text-white transition-colors`}>
        <p className="text-sm font-medium opacity-80">{greeting},</p>
        <h1 className="text-2xl font-bold mt-0.5">{firstName} 🚛</h1>
        {currentUser.ratingCount > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <Stars value={currentUser.rating} size={16} />
            <span className="text-sm opacity-80">{currentUser.rating} de 5</span>
          </div>
        )}

        <button
          onClick={toggleOnline}
          className={`mt-4 flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
            isOnline
              ? 'bg-white text-green-700 hover:bg-green-50'
              : 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
          }`}
        >
          <div className={`relative w-10 h-6 rounded-full transition-colors ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isOnline ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <span>{isOnline ? '🟢 En línea' : '⚫ Desconectado'}</span>
        </button>

        {!isOnline && <p className="text-xs opacity-70 mt-2">Conectate para ver solicitudes disponibles</p>}
      </div>

      {/* Active freight */}
      {activeFreight && (
        <div>
          <h2 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Flete en curso</h2>
          <button onClick={goToActive}
            className="w-full bg-blue-600 text-white rounded-xl p-4 text-left shadow-lg hover:bg-blue-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold">{STATUS_LABELS[activeFreight.status]}</span>
              <span className="flex items-center gap-1 text-xs text-blue-200">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Activo
              </span>
            </div>
            <div className="text-sm space-y-1 text-blue-100">
              <p>📍 {activeFreight.origin}</p>
              <p>🏁 {activeFreight.destination}</p>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <span className="font-bold text-lg">{fmt.currency(activeFreight.price)}</span>
              <span className="text-sm font-semibold underline">Continuar →</span>
            </div>
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard emoji="🚛" label="Viajes totales"
          value={db.freights.getAll().filter(f => f.driverId === currentUser.id).length} />
        <StatCard emoji="⭐" label="Mi calificación"
          value={currentUser.ratingCount > 0 ? `${currentUser.rating}/5` : 'Sin datos'} />
      </div>

      {/* Pending requests */}
      {!activeFreight && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
              {isOnline ? 'Solicitudes disponibles' : 'Solicitudes (offline)'}
            </h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {pendingFreights.length}
            </span>
          </div>

          {pendingFreights.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <div className="text-4xl mb-2">{isOnline ? '🔍' : '😴'}</div>
              <p className="font-semibold text-gray-700">
                {isOnline ? 'No hay solicitudes en este momento' : 'Estás desconectado'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {isOnline ? 'Las nuevas solicitudes aparecerán acá automáticamente' : 'Conectate para ver solicitudes'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingFreights.map(f => (
                <RequestCard
                  key={f.id}
                  freight={f}
                  onClick={() => {
                    setSelectedRequestId(f.id)
                    setScreen('request-detail')
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
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

function RequestCard({ freight: f, onClick }) {
  const client = db.users.find(f.clientId)
  const age = Math.round((Date.now() - new Date(f.createdAt)) / 60000)
  return (
    <button onClick={onClick} className="w-full bg-white rounded-xl shadow-sm p-4 text-left hover:shadow-md transition-shadow border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
              {client?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
            </div>
            <span className="font-semibold text-gray-900 text-sm">{client?.name || 'Cliente'}</span>
            {client?.ratingCount > 0 && <Stars value={client.rating} size={12} />}
          </div>
          <p className="text-xs text-gray-500">Hace {age < 1 ? 'un momento' : `${age} min`}</p>
        </div>
        <div className="text-right ml-2">
          <p className="font-bold text-blue-600 text-lg">{fmt.currency(f.price)}</p>
          <p className="text-xs text-gray-400">{f.km} km</p>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-700 flex items-center gap-1.5">
          <span className="text-base">📍</span>
          <span className="truncate">{f.origin}</span>
        </p>
        <p className="text-sm text-gray-700 flex items-center gap-1.5">
          <span className="text-base">🏁</span>
          <span className="truncate">{f.destination}</span>
        </p>
      </div>
      {(f.extras?.peon || f.extras?.stairs) && (
        <div className="mt-2 flex gap-1">
          {f.extras.peon && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">👷 Peón</span>}
          {f.extras.stairs && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">🏗️ Pasillos</span>}
        </div>
      )}
      <div className="mt-3 text-right text-xs text-blue-600 font-semibold">Ver detalles →</div>
    </button>
  )
}
