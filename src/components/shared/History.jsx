import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { db, fmt, STATUS_LABELS } from '../../utils/storage'
import { Stars } from './StarRating'

const STATUS_COLOR = {
  pending:   'bg-yellow-100 text-yellow-700',
  accepted:  'bg-blue-100 text-blue-700',
  picking:   'bg-purple-100 text-purple-700',
  transit:   'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
}

export default function History() {
  const { currentUser, dataVersion } = useApp()
  const [freights, setFreights] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const all = db.freights.getAll()
    const mine = currentUser.role === 'client'
      ? all.filter(f => f.clientId === currentUser.id)
      : all.filter(f => f.driverId === currentUser.id)
    setFreights(mine.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  }, [dataVersion, currentUser.id])

  if (selected) {
    return <FreightDetail freight={selected} onBack={() => setSelected(null)} role={currentUser.role} userId={currentUser.id} />
  }

  if (freights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <div className="text-5xl">📋</div>
        <p className="font-semibold text-gray-700">Sin historial aún</p>
        <p className="text-sm text-gray-500 text-center">Tus fletes aparecerán acá una vez que los completes</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="font-bold text-gray-900 text-lg">Historial de fletes</h2>
      {freights.map(f => <FreightCard key={f.id} freight={f} role={currentUser.role} userId={currentUser.id} onClick={() => setSelected(f)} />)}
    </div>
  )
}

function FreightCard({ freight: f, role, userId, onClick }) {
  const otherUser = role === 'client' ? db.users.find(f.driverId) : db.users.find(f.clientId)
  const ratings = db.ratings.getAll()
  const myRating = ratings.find(r => r.freightId === f.id && r.ratedId === userId)

  return (
    <button onClick={onClick} className="w-full bg-white rounded-xl shadow-sm p-4 text-left hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">{fmt.datetime(f.createdAt)}</p>
          <p className="font-semibold text-gray-900 text-sm truncate">{f.origin}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <span>→</span> {f.destination}
          </p>
        </div>
        <div className="text-right ml-3">
          <p className="font-bold text-blue-600">{fmt.currency(f.price)}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[f.status] || STATUS_COLOR.completed}`}>
            {STATUS_LABELS[f.status] || 'Completado'}
          </span>
        </div>
      </div>
      {otherUser && (
        <p className="text-xs text-gray-500">{role === 'client' ? '🚛' : '👤'} {otherUser.name}</p>
      )}
      {myRating && (
        <div className="mt-2 flex items-center gap-1">
          <Stars value={myRating.stars} size={14} />
          <span className="text-xs text-gray-400">Recibiste {myRating.stars}⭐</span>
        </div>
      )}
    </button>
  )
}

function FreightDetail({ freight: f, onBack, role, userId }) {
  const ratings = db.ratings.getAll()
  const myRating = ratings.find(r => r.freightId === f.id && r.ratedId === userId)
  const iGaveRating = ratings.find(r => r.freightId === f.id && r.raterId === userId)
  const otherUser = role === 'client' ? db.users.find(f.driverId) : db.users.find(f.clientId)

  return (
    <div className="p-4 space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 font-medium text-sm">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        Volver
      </button>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-gray-900">Detalles del flete</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[f.status] || STATUS_COLOR.completed}`}>
            {STATUS_LABELS[f.status]}
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <InfoRow label="Fecha" value={fmt.datetime(f.createdAt)} />
          <InfoRow label="Origen" value={f.origin} />
          <InfoRow label="Destino" value={f.destination} />
          <InfoRow label="Distancia" value={`${f.km} km`} />
          <InfoRow label="Precio" value={fmt.currency(f.price)} bold />
          <InfoRow label="Pago" value={f.paymentTiming === 'before' ? 'Antes de cargar' : 'Después de descargar'} />
          {f.extras?.peon && <InfoRow label="Peón" value="Incluido (+$15.000)" />}
          {f.extras?.stairs && <InfoRow label="Pasillos/escaleras" value="Incluido (+$5.000)" />}
        </div>
      </div>

      {otherUser && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">{role === 'client' ? 'Transportista' : 'Cliente'}</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
              {otherUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{otherUser.name}</p>
              <Stars value={otherUser.rating} size={14} />
            </div>
          </div>
        </div>
      )}

      {myRating && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Calificación que recibiste</h3>
          <Stars value={myRating.stars} size={20} />
          {myRating.justification && <p className="text-sm text-gray-600 mt-2 italic">"{myRating.justification}"</p>}
        </div>
      )}

      {iGaveRating && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Calificación que diste</h3>
          <Stars value={iGaveRating.stars} size={20} />
          {iGaveRating.justification && <p className="text-sm text-gray-600 mt-2 italic">"{iGaveRating.justification}"</p>}
        </div>
      )}

      {f.photos?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Fotos de la carga</h3>
          <div className="grid grid-cols-2 gap-2">
            {f.photos.map((src, i) => (
              <img key={i} src={src} alt={`Foto ${i+1}`} className="rounded-lg w-full h-28 object-cover" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, bold }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={bold ? 'font-bold text-blue-600' : 'text-gray-900 text-right max-w-[55%]'}>{value}</span>
    </div>
  )
}
