import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { db, fmt, STATUS_LABELS, STATUS_STEPS } from '../../utils/storage'
import { Stars, RatingInput } from '../shared/StarRating'
import { compressImage } from '../../utils/imageUtils'

const CONDITIONS = ['Sin problemas', 'Rayado', 'Rajado', 'Roto']
const STEP_LABELS = ['Pendiente', 'Asignado', 'Recogiendo', 'Tránsito', 'Entregado']

export default function DriverActiveFreight() {
  const { currentUser, setScreen, activeFreightId, updateFreight, addExtraCharge, addRating, dataVersion, addToast } = useApp()
  const [freight, setFreight] = useState(null)
  const [client, setClient] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [rating, setRating] = useState(0)
  const [justification, setJustification] = useState('')
  const [showRating, setShowRating] = useState(false)
  const [ratingDone, setRatingDone] = useState(false)
  const [showExtraCharge, setShowExtraCharge] = useState(false)
  const [extraDesc, setExtraDesc] = useState('')
  const [extraAmount, setExtraAmount] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const fileRef = useRef()

  const loadFreight = () => {
    const all = db.freights.getAll()
    const f = activeFreightId
      ? all.find(fr => fr.id === activeFreightId)
      : all.find(fr => fr.driverId === currentUser.id &&
          ['accepted','picking','transit','delivered'].includes(fr.status))
    setFreight(f || null)
    if (f?.clientId) setClient(db.users.find(f.clientId))
    if (f) setRatingDone(!!db.ratings.getAll().find(r => r.freightId === f.id && r.raterId === currentUser.id))
  }

  useEffect(loadFreight, [dataVersion, activeFreightId, currentUser.id])
  useEffect(() => {
    const iv = setInterval(loadFreight, 2500)
    return () => clearInterval(iv)
  }, [activeFreightId, currentUser.id])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !freight) return
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const newPhotos = [...(freight.photos || []), compressed]
      updateFreight(freight.id, { photos: newPhotos })
      addToast('Foto agregada', 'success')
    } catch {
      addToast('Error al procesar la foto', 'error')
    }
    setUploading(false)
    e.target.value = ''
  }

  const removePhoto = (idx) => {
    const newPhotos = freight.photos.filter((_, i) => i !== idx)
    updateFreight(freight.id, { photos: newPhotos })
    addToast('Foto eliminada', 'info')
  }

  const toggleCondition = (cond) => {
    if (!freight) return
    const curr = freight.cargoCondition || []
    updateFreight(freight.id, {
      cargoCondition: curr.includes(cond) ? curr.filter(c => c !== cond) : [...curr, cond]
    })
  }

  const handleArrivedAtClient = () => {
    updateFreight(freight.id, { status: 'picking' })
    addToast('Estado actualizado: Recogiendo carga', 'info')
  }

  const handleStartTransit = () => {
    if (!freight.photos?.length) { addToast('Tomá al menos una foto de la carga', 'warning'); return }
    if (!freight.cargoCondition?.length) { addToast('Seleccioná el estado de la carga', 'warning'); return }
    if (!freight.clientConfirmed) { addToast('Esperá la confirmación del cliente', 'warning'); return }
    updateFreight(freight.id, { status: 'transit' })
    addToast('¡Viaje iniciado!', 'success')
  }

  const handleDelivered = () => {
    updateFreight(freight.id, { status: 'delivered' })
    addToast('¡Entrega completada!', 'success')
  }

  const handleAddExtraCharge = () => {
    if (!extraDesc.trim() || !extraAmount || Number(extraAmount) <= 0) {
      addToast('Ingresá descripción y monto válido', 'warning'); return
    }
    addExtraCharge(freight.id, extraDesc.trim(), Number(extraAmount))
    setExtraDesc(''); setExtraAmount(''); setShowExtraCharge(false)
  }

  const handleRateClient = () => {
    if (!rating || !client) return
    if (rating <= 3 && !justification.trim()) { addToast('Justificá la calificación baja', 'warning'); return }
    addRating(freight.id, client.id, rating, justification)
    updateFreight(freight.id, { driverRated: true })
    setShowRating(false); setRatingDone(true)
    setScreen('home')
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

  if (showRating && client) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="font-bold text-gray-900 text-xl">Calificar al cliente</h2>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
              {client.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{client.name}</p>
              <p className="text-xs text-gray-500">¿Cómo fue este cliente?</p>
            </div>
          </div>
          <div className="flex justify-center mb-4">
            <RatingInput value={rating} onChange={setRating} />
          </div>
          {rating > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {rating <= 3 ? <>Justificación <span className="text-red-500">*</span></> : 'Comentario (opcional)'}
              </label>
              <textarea value={justification} onChange={e => setJustification(e.target.value)}
                placeholder={rating <= 3 ? 'Describí el problema...' : '¿Algo destacable?'}
                rows={3} className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          )}
          <button onClick={handleRateClient} disabled={!rating}
            className="mt-4 w-full bg-blue-600 disabled:bg-gray-300 text-white font-bold rounded-xl py-3">
            Enviar calificación
          </button>
          <button onClick={() => { setShowRating(false); setScreen('home') }}
            className="mt-2 w-full text-gray-400 text-sm py-2">Calificar después</button>
        </div>
      </div>
    )
  }

  const stepIdx = STATUS_STEPS.indexOf(freight.status)

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setScreen('home')} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-600">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div>
          <h1 className="font-bold text-gray-900">Flete en curso</h1>
          <p className="text-xs text-gray-500 truncate">{freight.origin} → {freight.destination}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-start">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center relative">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                i < stepIdx ? 'bg-green-500 text-white' :
                i === stepIdx ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-400'}`}>
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
        {freight.statusHistory?.length > 1 && (
          <button onClick={() => setShowHistory(h => !h)}
            className="mt-3 w-full text-xs text-blue-600 font-medium text-center py-1 border-t border-gray-100">
            {showHistory ? '▲ Ocultar historial' : '▼ Ver historial de estados'}
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

      {/* Client info */}
      {client && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3">👤 Cliente</h2>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
              {client.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{client.name}</p>
              {client.ratingCount > 0 && <Stars value={client.rating} size={13} />}
              <p className="text-xs text-gray-500">📱 {client.phone} · 🪪 {client.dni}</p>
            </div>
          </div>
        </div>
      )}

      {/* ACTION: Accepted */}
      {freight.status === 'accepted' && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">📍 Dirigite al punto de partida</h2>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">Dirección de carga</p>
            <p className="text-sm font-medium text-gray-700">{freight.origin}</p>
          </div>
          <button onClick={handleArrivedAtClient}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-4">
            ✅ Llegué al cliente
          </button>
        </div>
      )}

      {/* ACTION: Picking */}
      {freight.status === 'picking' && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <h2 className="font-semibold text-gray-900">📸 Verificar estado de la carga</h2>

          {/* Photos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">
                Fotos <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 ml-1">({freight.photos?.length || 0})</span>
              </p>
            </div>
            {freight.photos?.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {freight.photos.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt="" className="rounded-lg w-full h-20 object-cover border border-gray-200" />
                    <button onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-full border-2 border-dashed border-blue-300 hover:border-blue-500 text-blue-600 rounded-xl py-3 text-sm font-medium">
              {uploading ? '⏳ Comprimiendo y subiendo...' : '📷 Agregar foto'}
            </button>
          </div>

          {/* Cargo condition */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Estado de la carga <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map(cond => {
                const selected = freight.cargoCondition?.includes(cond)
                return (
                  <button key={cond} onClick={() => toggleCondition(cond)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all text-left ${
                      selected
                        ? cond === 'Sin problemas' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-600'}`}>
                    {cond === 'Sin problemas' ? '✅' : '⚠️'} {cond}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Observaciones</label>
            <textarea value={freight.observations || ''} rows={2}
              onChange={e => updateFreight(freight.id, { observations: e.target.value })}
              placeholder="Detalles adicionales sobre la carga..."
              className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* Client confirmation */}
          <div className={`rounded-xl p-3 border-2 ${freight.clientConfirmed ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
            <p className={`text-sm font-semibold ${freight.clientConfirmed ? 'text-green-700' : 'text-yellow-700'}`}>
              {freight.clientConfirmed ? '✅ Cliente confirmó el embalaje' : '⏳ Esperando confirmación del cliente...'}
            </p>
          </div>

          <button onClick={handleStartTransit}
            disabled={!freight.photos?.length || !freight.cargoCondition?.length || !freight.clientConfirmed}
            className="w-full bg-blue-600 disabled:bg-gray-300 text-white font-bold rounded-xl py-4">
            🚛 Iniciar viaje
          </button>
        </div>
      )}

      {/* ACTION: Transit */}
      {freight.status === 'transit' && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">🏁 En camino al destino</h2>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">Dirección de entrega</p>
            <p className="text-sm font-medium text-gray-700">{freight.destination}</p>
          </div>
          {freight.paymentTiming === 'after' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm text-orange-700 font-medium">💳 Cobrá al entregar</span>
              <span className="font-bold text-orange-700 text-lg">{fmt.currency(freight.price)}</span>
            </div>
          )}
          <button onClick={handleDelivered}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-4">
            ✅ Llegué al destino / Entregado
          </button>
        </div>
      )}

      {/* Delivered */}
      {freight.status === 'delivered' && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-300 rounded-xl p-4">
            <h2 className="font-bold text-green-800 text-lg mb-3">🎉 ¡Flete entregado!</h2>

            {/* Price breakdown */}
            <div className="bg-white rounded-lg p-3 space-y-1.5 text-sm mb-3">
              <div className="flex justify-between text-gray-600">
                <span>{freight.km} km × $3.500</span>
                <span>{fmt.currency(freight.km * 3500)}</span>
              </div>
              {freight.extras?.peon && <div className="flex justify-between text-gray-600"><span>👷 Peón</span><span>+$15.000</span></div>}
              {freight.extras?.stairs && <div className="flex justify-between text-gray-600"><span>🏗️ Pasillos</span><span>+$5.000</span></div>}
              {freight.extraCharges?.map((c, i) => (
                <div key={i} className="flex justify-between text-gray-600">
                  <span>➕ {c.description}</span><span>+{fmt.currency(c.amount)}</span>
                </div>
              ))}
              <div className="border-t pt-1.5 flex justify-between font-bold text-green-700">
                <span>Total a cobrar</span>
                <span className="text-lg">{fmt.currency(freight.price)}</span>
              </div>
            </div>

            <p className="text-xs text-green-600">
              {freight.paymentTiming === 'before' ? '💳 El cliente pagó al inicio del viaje' : '💳 Cobrá al cliente ahora'}
            </p>
          </div>

          {/* Add extra charge */}
          {!showExtraCharge ? (
            <button onClick={() => setShowExtraCharge(true)}
              className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-500 hover:text-blue-600 rounded-xl py-3 text-sm font-medium transition-colors">
              ➕ Agregar cargo extra no contemplado
            </button>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Agregar cargo extra</h3>
              <input value={extraDesc} onChange={e => setExtraDesc(e.target.value)}
                placeholder="Descripción (ej: Desmonte de mueble)"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="number" value={extraAmount} onChange={e => setExtraAmount(e.target.value)}
                placeholder="Monto en pesos"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setShowExtraCharge(false); setExtraDesc(''); setExtraAmount('') }}
                  className="py-2.5 border border-gray-300 rounded-xl text-gray-600 text-sm font-medium">
                  Cancelar
                </button>
                <button onClick={handleAddExtraCharge}
                  className="py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold">
                  Agregar
                </button>
              </div>
            </div>
          )}

          {!ratingDone ? (
            <button onClick={() => setShowRating(true)}
              className="w-full bg-blue-600 text-white font-bold rounded-xl py-4">
              ⭐ Calificar al cliente
            </button>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="font-semibold text-gray-700">✅ ¡Todo completado!</p>
              <button onClick={() => setScreen('home')} className="mt-2 text-blue-600 font-medium text-sm">
                Volver al inicio
              </button>
            </div>
          )}
        </div>
      )}

      {/* Price summary */}
      <div className="bg-white rounded-xl shadow-sm p-4 text-sm space-y-1.5">
        <h2 className="font-semibold text-gray-900 mb-2">Resumen de precio</h2>
        <div className="flex justify-between text-gray-600"><span>{freight.km} km × $3.500</span><span>{fmt.currency(freight.km * 3500)}</span></div>
        {freight.extras?.peon && <div className="flex justify-between text-gray-600"><span>Peón</span><span>+$15.000</span></div>}
        {freight.extras?.stairs && <div className="flex justify-between text-gray-600"><span>Pasillos</span><span>+$5.000</span></div>}
        {freight.extraCharges?.map((c, i) => (
          <div key={i} className="flex justify-between text-gray-600"><span>{c.description}</span><span>+{fmt.currency(c.amount)}</span></div>
        ))}
        <div className="border-t pt-1.5 flex justify-between font-bold text-blue-600">
          <span>Total</span><span>{fmt.currency(freight.price)}</span>
        </div>
      </div>
    </div>
  )
}
