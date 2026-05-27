import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { db, fmt } from '../../utils/storage'
import { Stars } from '../shared/StarRating'

export default function RequestDetail() {
  const { currentUser, selectedRequestId, setScreen, setActiveFreightId, updateFreight, dataVersion } = useApp()
  const [freight, setFreight] = useState(null)
  const [client, setClient] = useState(null)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (!selectedRequestId) { setScreen('home'); return }
    const f = db.freights.find(selectedRequestId)
    setFreight(f)
    if (f?.clientId) setClient(db.users.find(f.clientId))
    if (f?.status === 'accepted' && f?.driverId === currentUser.id) setAccepted(true)
  }, [selectedRequestId, dataVersion])

  const handleAccept = () => {
    if (!freight) return
    updateFreight(freight.id, { driverId: currentUser.id, status: 'accepted' })
    setAccepted(true)
    setActiveFreightId(freight.id)
  }

  const handleReject = () => {
    setScreen('home')
  }

  const handleGo = () => {
    setScreen('active-freight')
  }

  if (!freight) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-500">Solicitud no encontrada</p>
    </div>
  )

  // Already taken by another driver
  if (freight.status !== 'pending' && freight.driverId !== currentUser.id) {
    return (
      <div className="p-4 space-y-4">
        <button onClick={() => setScreen('home')} className="flex items-center gap-2 text-blue-600 font-medium text-sm">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Volver
        </button>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-center">
          <div className="text-4xl mb-2">😅</div>
          <p className="font-bold text-yellow-800">Esta solicitud ya fue tomada</p>
          <p className="text-sm text-yellow-700 mt-1">Otro transportista la tomó primero. Buscá otra solicitud.</p>
          <button onClick={() => setScreen('home')} className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium text-sm">
            Ver otras solicitudes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setScreen('home')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-600">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div>
          <h1 className="font-bold text-gray-900">Detalle de solicitud</h1>
          {accepted && <span className="text-xs text-green-600 font-medium">✅ Aceptada</span>}
        </div>
      </div>

      {/* Client info */}
      {client && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3">👤 Cliente</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-base">
              {client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{client.name}</p>
              {client.ratingCount > 0 ? (
                <div className="flex items-center gap-1.5">
                  <Stars value={client.rating} size={14} />
                  <span className="text-xs text-gray-500">{client.rating} ({client.ratingCount} calif.)</span>
                </div>
              ) : <p className="text-xs text-gray-400">Sin calificaciones aún</p>}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-400">DNI</p>
              <p className="font-medium text-gray-900">{client.dni}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Teléfono</p>
              <p className="font-medium text-gray-900">{client.phone}</p>
            </div>
          </div>
        </div>
      )}

      {/* Freight details */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2.5">
        <h2 className="font-semibold text-gray-900 mb-3">📦 Detalles del flete</h2>
        <InfoRow label="📍 Origen" value={freight.origin} />
        <InfoRow label="🏁 Destino" value={freight.destination} />
        <InfoRow label="📏 Distancia" value={`${freight.km} km`} />
        <InfoRow label="💳 Pago" value={freight.paymentTiming === 'before' ? 'Antes de cargar' : 'Después de descargar'} />
      </div>

      {/* Extras */}
      {(freight.extras?.peon || freight.extras?.stairs) && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Servicios adicionales</h2>
          {freight.extras?.peon && (
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-700">👷 Peón para cargar/descargar</span>
              <span className="text-sm font-semibold text-blue-600">+$15.000</span>
            </div>
          )}
          {freight.extras?.stairs && (
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-700">🏗️ Pasillos o escaleras</span>
              <span className="text-sm font-semibold text-blue-600">+$5.000</span>
            </div>
          )}
        </div>
      )}

      {/* Price */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-blue-700 font-medium">Precio total</p>
          <p className="text-xs text-blue-500">{freight.km} km × $3.500{freight.extras?.peon ? ' + peón' : ''}{freight.extras?.stairs ? ' + pasillos' : ''}</p>
        </div>
        <p className="text-2xl font-bold text-blue-600">{fmt.currency(freight.price)}</p>
      </div>

      {/* Action buttons */}
      {!accepted ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleReject}
            className="py-4 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold text-base hover:bg-gray-50 transition-colors"
          >
            ❌ Rechazar
          </button>
          <button
            onClick={handleAccept}
            className="py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-base transition-colors shadow-lg"
          >
            ✅ Aceptar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-300 rounded-xl p-4 text-center">
            <p className="font-bold text-green-800">¡Solicitud aceptada!</p>
            <p className="text-sm text-green-700 mt-1">El cliente ya sabe que vas en camino</p>
          </div>
          <button
            onClick={handleGo}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition-colors shadow-lg"
          >
            🚛 Ir al cliente
          </button>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[55%]">{value}</span>
    </div>
  )
}
