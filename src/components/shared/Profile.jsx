import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { db, fmt } from '../../utils/storage'
import { Stars } from './StarRating'

export default function Profile() {
  const { currentUser, updateUser, dataVersion } = useApp()
  const [ratings, setRatings] = useState([])
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(currentUser.name)
  const [vehicle, setVehicle] = useState(currentUser.vehicle || '')

  useEffect(() => {
    setRatings(db.ratings.forUser(currentUser.id))
  }, [dataVersion, currentUser.id])

  const handleSave = () => {
    if (!name.trim()) return
    updateUser({ name: name.trim(), vehicle: vehicle.trim() })
    setEditing(false)
  }

  const initials = currentUser.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="p-4 space-y-4">
      {/* Avatar + info */}
      <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold text-2xl flex items-center justify-center mb-3 shadow-lg">
          {initials}
        </div>
        {editing ? (
          <div className="w-full space-y-3 mt-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
            {currentUser.role === 'driver' && (
              <input
                value={vehicle}
                onChange={e => setVehicle(e.target.value)}
                placeholder="Vehículo (ej: Ford Transit)"
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              />
            )}
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setName(currentUser.name) }}
                className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-2 text-sm font-medium">
                Cancelar
              </button>
              <button onClick={handleSave}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-medium">
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900">{currentUser.name}</h2>
            <span className={`mt-1 text-xs font-medium px-3 py-1 rounded-full ${
              currentUser.role === 'client' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {currentUser.role === 'client' ? '📦 Cliente' : '🚛 Transportista'}
            </span>
            {currentUser.ratingCount > 0 && (
              <div className="mt-3 flex flex-col items-center gap-1">
                <Stars value={currentUser.rating} size={22} />
                <p className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">{currentUser.rating}</span> de 5 — {currentUser.ratingCount} calificaciones
                </p>
              </div>
            )}
            <button onClick={() => setEditing(true)}
              className="mt-3 text-sm text-blue-600 font-medium hover:underline">
              ✏️ Editar perfil
            </button>
          </>
        )}
      </div>

      {/* Personal info */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-gray-900">Información personal</h3>
        {[
          { label: '📧 Email', value: currentUser.email },
          { label: '🪪 DNI', value: currentUser.dni },
          { label: '📱 Teléfono', value: currentUser.phone },
          ...(currentUser.vehicle ? [{ label: '🚛 Vehículo', value: currentUser.vehicle }] : []),
          { label: '📅 Miembro desde', value: fmt.date(currentUser.createdAt) },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value}</span>
          </div>
        ))}
      </div>

      {/* Ratings received */}
      {ratings.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Calificaciones recibidas</h3>
          <div className="space-y-3">
            {ratings.slice().reverse().slice(0, 10).map(r => {
              const rater = db.users.find(r.raterId)
              return (
                <div key={r.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{rater?.name || 'Usuario'}</span>
                    <div className="flex items-center gap-1">
                      <Stars value={r.stars} size={14} />
                      <span className="text-xs text-gray-400">{fmt.date(r.timestamp)}</span>
                    </div>
                  </div>
                  {r.justification && (
                    <p className="text-xs text-gray-500 italic">"{r.justification}"</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
