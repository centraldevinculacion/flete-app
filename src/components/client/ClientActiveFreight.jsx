import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { db, fmt, STATUS_LABELS, STATUS_STEPS } from '../../utils/storage'
import { Stars, RatingInput } from '../shared/StarRating'

const STEP_LABELS = ['Solicitud enviada', 'Transportista asignado', 'Recogiendo carga', 'En tránsito', 'Entregado']

export default function ClientActiveFreight() {
  const { currentUser, setScreen, activeFreightId, updateFreight, cancelFreight, addRating, dataVersion, addToast } = useApp()
  const [freight, setFreight] = useState(null)
  const [driver, setDriver] = useState(null)
  const [rating, setRating] = useState(0)
  const [justification, setJustification] = useState('')
  const [showRating, setShowRating] = useState(false)
  const [ratingDone, setRatingDone] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const prevStatusRef = useRef(null)

  const loadFreight = () => {
    const all = db.freights.getAll()
    const f = activeFreightId
      ? all.find(fr => fr.id === activeFreightId)
      : all.find(fr => fr.clientId === currentUser.id &&
          ['pending','accepted','picking','transit','delivered'].includes(fr.status))
    if (f && prevStatusRef.current && f.status !== prevStatusRef.current) {
      addToast(`Estado actualizado: ${STATUS_LABELS[f.status]}`, 'info')
    }
    prevStatusRef.current = f?.status || null
    setFreight(f || null)
    if (f?.driverId) setDriver(db.users.find(f.driverId))
    if (f) {
      const myRating = db.ratings.getAll().find(r => r.freightId === f.id && r.raterId === currentUser.id)
      setRatingDone(!!myRating)
    }
  }

  useEffect(loadFreight, [dataVersion, activeFreightId, currentUser.id])
  useEffect(() => {
    const iv = setInterval(loadFreight, 2500)
    return () => clearInterval(iv)
  }, [activeFreightId, currentUser.id])

  const handleConfirmEmbalaje = (e) => {
    if (freight) updateFreight(freight.id, { clientConfirmed: e.target.checked })
  }

  const handleRateDriver = () => {
    if (!rating || !driver) return
    if (rating <= 3 && !justification.trim()) { addToast('Justificá la calificación baja', 'warning'); return }
    addRating(freight.id, driver.id, rating, justification)
    updateFreight(freight.id, { status: 'completed', clientRated: true })
    setShowRating(false)
    setRatingDone(true)
    setScreen('home')
  }

  const handleCancel = () => {
    cancelFreight(freight.id)
    setShowCancel(false)
  }

  if (!freight) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
        <div className="text-5xl">📭</div>
        <p className="font-semibold text-gray-700">No hay un flete activo</p>
        <button onClick={() => setScreen('home')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium">
          Volver al inicio
        </button>
      </div>
    )
  }

  if (showRating && driver) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="font-bold text-gray-900 text-xl">¡Flete completado! 🎉</h2>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
              {driver.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{driver.name}</p>
              <p className="text-xs text-gray-500">¿Cómo fue el servicio?</p>
            </div>
          </div>
          <div className="flex justify-center mb-4">
            <RatingInput value={rating} onChange={setRating} />
          </div>
          {rating > 0 && (
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {rating <= 3 ? <>Comentario <span className="text-red-500">*</span></> : 'Comentario (opcional)'}
              </label>
              <textarea
                value={justification}
                onChange={e => setJustification(e.target.value)}
                placeholder={rating <= 3 ? 'Describí qué falló...' : '¿Algo destacable?'}
                rows={3}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}
          <button onClick={handleRateDriver} disabled={!rating}
            className="mt-4 w-full bg-blue-600 disabled:bg-gray-300 text-white font-bold rounded-xl py-3">
            Enviar calificación
          </button>
          <button onClick={() => { setShowRating(false); setScreen('home') }}
            className="mt-2 w-full text-gray-400 text-sm py-2">
            Calificar después
          </button>
        </div>
      </div>
    )
  }

  const stepIdx = STATUS_STEPS.indexOf(freight.status)

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
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">Tu flete</h1>
          <p className="text-xs text-gray-500 truncate">{freight.origin} → {freight.destination}</p>
        </div>
        {freight.status === 'pending' && (
          <button onClick={() => setShowCancel(true)}
            className="text-xs text-red-500 font-medium border border-red-200 px-3 py-1.5 rounded-full">
            Cancelar
          </button>
        )}
      </div>

      {/* Cancel confirm modal */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-lg font-bold text-gray-900 mb-2">¿Cancelar la solicitud?</p>
            <p className="text-sm text-gray-500 mb-5">Esto eliminará tu solicitud de flete.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowCancel(false)}
                className="py-3 border border-gray-300 rounded-xl font-medium text-gray-700">
                No, mantener
              </button>
              <button onClick={handleCancel}
                className="py-3 bg-red-500 text-white rounded-xl font-bold">
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status timeline */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-start mb-2">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center relative">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                i < stepIdx ? 'bg-green-500 text-white' :
                i === stepIdx ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                'bg-gray-200 text-gray-400'}`}>
                {i < stepIdx ? '✓' : i + 1}
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`absolute top-3.5 left-1/2 w-full h-0.5 ${i < stepIdx ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
              <p className={`mt-2 text-[9px] text-center leading-tight ${i === stepIdx ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                {STEP_LABELS[i]}
              </p>
            </div>
          ))}
        </div>

        {/* Status history toggle */}
        {freight.statusHistory?.length > 1 && (
          <button onClick={() => setShowHistory(h => !h)}
            className="mt-3 w-full text-xs text-blue-600 font-medium text-center py-1 border-t border-gray-100">
            {showHistory ? '▲ Ocultar historial' : '▼ Ver historial de cambios'}
          </button>
        )}
        {showHistory && freight.statusHistory && (
          <div className="mt-2 space-y-1.5 pt-2 border-t border-gray-100">
            {freight.statusHistory.map((h, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-600 font-medium">{STATUS_LABELS[h.status]}</span>
                <span className="text-gray-400">{fmt.datetime(h.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Freight details */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-semibold text-gray-900 mb-2">Detalles</h2>
        <InfoRow label="📍 Origen" value={freight.origin} />
        <InfoRow label="🏁 Destino" value={freight.destination} />
        <InfoRow label="📏 Distancia" value={`${freight.km} km`} />
        <InfoRow label="💳 Pago" value={freight.paymentTiming === 'before' ? 'Antes de cargar' : 'Después de descargar'} />
        {freight.extras?.peon && <InfoRow label="👷 Peón" value="+$15.000" />}
        {freight.extras?.stairs && <InfoRow label="🏗️ Pasillos" value="+$5.000" />}
        {freight.extraCharges?.map((c, i) => (
          <InfoRow key={i} label={`➕ ${c.description}`} value={`+${fmt.currency(c.amount)}`} />
        ))}
        <div className="border-t pt-2 flex justify-between font-bold text-blue-600">
          <span>Total</span>
          <span className="text-lg">{fmt.currency(freight.price)}</span>
        </div>
      </div>

      {/* Driver info */}
      {driver ? (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Tu transportista</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
              {driver.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{driver.name}</p>
              <Stars value={driver.rating} size={14} />
              <p className="text-xs text-gray-500 mt-0.5">📱 {driver.phone}</p>
              {driver.vehicle && <p className="text-xs text-gray-500">🚛 {driver.vehicle}</p>}
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">⏳</div>
          <p className="font-semibold text-yellow-800">Esperando transportista</p>
          <p className="text-xs text-yellow-700 mt-1">Tu solicitud está visible para los transportistas online.</p>
        </div>
      )}

      {/* Confirm embalaje */}
      {freight.status === 'picking' && (
        <div className={`rounded-xl border-2 p-4 ${freight.clientConfirmed ? 'bg-green-50 border-green-300' : 'bg-white border-orange-300'}`}>
          <h2 className="font-semibold text-gray-900 mb-3">⚠️ Verificación de carga</h2>
          {freight.photos?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">Fotos del transportista:</p>
              <div className="grid grid-cols-3 gap-1.5">
                {freight.photos.map((src, i) => (
                  <img key={i} src={src} alt="" className="rounded-lg w-full h-20 object-cover border border-gray-200" />
                ))}
              </div>
            </div>
          )}
          {freight.cargoCondition?.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {freight.cargoCondition.map(c => (
                <span key={c} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  c === 'Sin problemas' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c}</span>
              ))}
            </div>
          )}
          {freight.observations && (
            <div className="mb-3 bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-500 mb-0.5">Observaciones:</p>
              <p className="text-sm text-gray-700">{freight.observations}</p>
            </div>
          )}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={freight.clientConfirmed} onChange={handleConfirmEmbalaje}
              className="mt-0.5 w-5 h-5 rounded text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Confirmo que está todo embalado</p>
              <p className="text-xs text-gray-500">Autorizo el traslado de la carga</p>
            </div>
          </label>
        </div>
      )}

      {/* Delivered */}
      {freight.status === 'delivered' && !ratingDone && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="font-bold text-green-800 text-lg">¡Flete entregado!</p>
          <p className="text-sm text-green-700 mt-1 mb-4">¿Cómo fue el servicio?</p>
          <button onClick={() => setShowRating(true)}
            className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl">
            ⭐ Calificar al transportista
          </button>
        </div>
      )}

      {ratingDone && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl mb-1">⭐</p>
          <p className="font-semibold text-green-800">¡Gracias por calificar!</p>
          <button onClick={() => setScreen('home')} className="mt-3 text-blue-600 font-medium text-sm block w-full">
            Volver al inicio
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
