import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { db, fmt } from '../../utils/storage'
import { storageUsageMB } from '../../utils/imageUtils'
import { Stars } from './StarRating'

export default function Profile() {
  const { currentUser, updateUser, dataVersion, addToast, logout } = useApp()
  const [ratings, setRatings] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: currentUser.name, vehicle: currentUser.vehicle || '', phone: currentUser.phone || '' })
  const [storageUsed, setStorageUsed] = useState('?')
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    setRatings(db.ratings.forUser(currentUser.id))
    setStorageUsed(storageUsageMB())
  }, [dataVersion, currentUser.id])

  const handleSave = () => {
    if (!form.name.trim()) { addToast('El nombre no puede estar vacío', 'error'); return }
    updateUser({ name: form.name.trim(), vehicle: form.vehicle.trim(), phone: form.phone.trim() })
    addToast('Perfil actualizado', 'success')
    setEditing(false)
  }

  const handleExport = () => {
    const freights = db.freights.getAll().filter(f => f.clientId === currentUser.id || f.driverId === currentUser.id)
    const data = {
      exportDate: new Date().toISOString(),
      user: { ...currentUser, password: undefined },
      freights: freights.map(f => ({ ...f, photos: `[${f.photos?.length || 0} fotos]` })),
      ratingsReceived: db.ratings.forUser(currentUser.id),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fleteapp-backup-${currentUser.name.replace(/ /g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
    addToast('Datos exportados', 'success')
  }

  const handleClearData = () => {
    // Only clear this user's data
    const freights = db.freights.getAll().filter(f => f.clientId !== currentUser.id && f.driverId !== currentUser.id)
    db.freights.save(freights)
    const msgs = db.messages.getAll().filter(m => {
      const relatedFreightIds = freights.map(f => f.id)
      return relatedFreightIds.includes(m.freightId)
    })
    db.messages.save(msgs)
    setShowClearConfirm(false)
    setStorageUsed(storageUsageMB())
    addToast('Historial eliminado', 'warning')
  }

  const initials = currentUser.name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
  const storageNum = parseFloat(storageUsed)
  const storageColor = storageNum > 3 ? 'text-red-600' : storageNum > 1.5 ? 'text-orange-500' : 'text-green-600'

  return (
    <div className="p-4 space-y-4">
      {/* Avatar card */}
      <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 text-white font-bold text-2xl flex items-center justify-center mb-3 shadow-lg">
          {initials}
        </div>

        {editing ? (
          <div className="w-full space-y-3 mt-1">
            {[
              { key: 'name', placeholder: 'Tu nombre', label: 'Nombre' },
              { key: 'phone', placeholder: 'Teléfono', label: 'Teléfono' },
              ...(currentUser.role === 'driver' ? [{ key: 'vehicle', placeholder: 'Vehículo', label: 'Vehículo' }] : []),
            ].map(({ key, placeholder, label }) => (
              <div key={key} className="text-left">
                <label className="text-xs text-gray-500 mb-0.5 block">{label}</label>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setEditing(false); setForm({ name: currentUser.name, vehicle: currentUser.vehicle || '', phone: currentUser.phone || '' }) }}
                className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-2.5 text-sm font-medium">
                Cancelar
              </button>
              <button onClick={handleSave}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold">
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900">{currentUser.name}</h2>
            <span className={`mt-1 text-xs font-medium px-3 py-1 rounded-full ${
              currentUser.role === 'client' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {currentUser.role === 'client' ? '📦 Cliente' : '🚛 Transportista'}
            </span>
            {currentUser.ratingCount > 0 ? (
              <div className="mt-3 flex flex-col items-center gap-1">
                <Stars value={currentUser.rating} size={22} />
                <p className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">{currentUser.rating}</span> / 5 — {currentUser.ratingCount} calificaciones
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-400">Sin calificaciones aún</p>
            )}
            <button onClick={() => setEditing(true)} className="mt-3 text-sm text-blue-600 font-medium hover:underline">
              ✏️ Editar perfil
            </button>
          </>
        )}
      </div>

      {/* Personal info */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2.5">
        <h3 className="font-semibold text-gray-900">Información personal</h3>
        {[
          { label: '📧 Email', value: currentUser.email },
          { label: '🪪 DNI', value: currentUser.dni },
          { label: '📱 Teléfono', value: currentUser.phone },
          ...(currentUser.vehicle ? [{ label: '🚛 Vehículo', value: currentUser.vehicle }] : []),
          { label: '📅 Miembro desde', value: fmt.date(currentUser.createdAt) },
          { label: '🏆 Total de fletes', value: db.freights.getAll().filter(f => f.clientId === currentUser.id || f.driverId === currentUser.id).length },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value}</span>
          </div>
        ))}
      </div>

      {/* Storage & Tools */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-gray-900">Datos y almacenamiento</h3>
        <div className="flex justify-between items-center py-1 border-b border-gray-50">
          <span className="text-sm text-gray-500">💾 Almacenamiento usado</span>
          <span className={`text-sm font-bold ${storageColor}`}>{storageUsed} MB</span>
        </div>
        {storageNum > 3 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">
            ⚠️ El almacenamiento está casi lleno. Las fotos ocupan mucho espacio. Considerá limpiar el historial.
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleExport}
            className="flex items-center justify-center gap-1.5 py-2.5 border border-blue-200 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50">
            📥 Exportar datos
          </button>
          <button onClick={() => setShowClearConfirm(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50">
            🗑️ Limpiar historial
          </button>
        </div>
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
                    <div className="flex items-center gap-1.5">
                      <Stars value={r.stars} size={13} />
                      <span className="text-xs text-gray-400">{fmt.date(r.timestamp)}</span>
                    </div>
                  </div>
                  {r.justification && <p className="text-xs text-gray-500 italic">"{r.justification}"</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Logout */}
      <button onClick={logout}
        className="w-full border border-red-200 text-red-500 hover:bg-red-50 rounded-xl py-3 font-medium text-sm transition-colors">
        🚪 Cerrar sesión
      </button>

      {/* Clear confirm modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-lg font-bold text-gray-900 mb-2">¿Limpiar historial?</p>
            <p className="text-sm text-gray-500 mb-5">Se eliminarán todos tus fletes y fotos almacenadas. Esta acción no se puede deshacer.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowClearConfirm(false)}
                className="py-3 border border-gray-300 rounded-xl font-medium text-gray-700 text-sm">Cancelar</button>
              <button onClick={handleClearData}
                className="py-3 bg-red-500 text-white rounded-xl font-bold text-sm">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
