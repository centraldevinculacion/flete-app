import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { db, fmt, calcPrice } from '../../utils/storage'
import { Stars } from '../shared/StarRating'

export default function RequestFreight() {
  const { currentUser, setScreen, createFreight, setActiveFreightId } = useApp()
  const [form, setForm] = useState({
    origin: '', destination: '', km: '',
    extras: { peon: false, stairs: false },
    paymentTiming: 'after',
    selectedDriverId: null,
  })
  const [onlineDrivers, setOnlineDrivers] = useState([])
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    setOnlineDrivers(db.users.getAll().filter(u => u.role === 'driver' && u.online))
  }, [])

  const km = parseFloat(form.km) || 0
  const price = km > 0 ? calcPrice(km, form.extras) : 0

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  const setExtra = (key) => (e) => setForm(f => ({ ...f, extras: { ...f.extras, [key]: e.target.checked } }))

  const handleNext = () => {
    if (step === 1) {
      if (!form.origin.trim() || !form.destination.trim()) { setError('Completá origen y destino'); return }
      if (!form.km || km <= 0) { setError('Ingresá una distancia válida'); return }
      setError('')
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  const handleConfirm = async () => {
    const freight = await createFreight({
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      km,
      price,
      extras: form.extras,
      paymentTiming: form.paymentTiming,
      preferredDriverId: form.selectedDriverId,
    })
    setActiveFreightId(freight.id)
    setScreen('active-freight')
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => step === 1 ? setScreen('home') : setStep(s => s - 1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-600">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div>
          <h1 className="font-bold text-gray-900 text-lg">Solicitar flete</h1>
          <p className="text-xs text-gray-500">Paso {step} de 3</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {[1,2,3].map(s => (
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* Step 1: Route details */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-900">Recorrido</h2>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">📍 Punto de partida</label>
              <input
                value={form.origin}
                onChange={set('origin')}
                placeholder="ej: Av. Corrientes 1234, CABA"
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">🏁 Punto de destino</label>
              <input
                value={form.destination}
                onChange={set('destination')}
                placeholder="ej: Florida 555, Vicente López"
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">📏 Distancia (km)</label>
              <input
                type="number"
                min="1"
                value={form.km}
                onChange={set('km')}
                placeholder="ej: 12"
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Podés calcularlo en Google Maps antes de continuar</p>
            </div>
          </div>

          {/* Extras */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-900">Servicios adicionales</h2>
            {[
              { key: 'peon', label: 'Peón para cargar/descargar', price: '+$15.000', desc: 'Ayudante para cargar y descargar' },
              { key: 'stairs', label: 'Pasillos o escaleras', price: '+$5.000', desc: 'Acceso con pasillos o escaleras (estimado)' },
            ].map(({ key, label, price, desc }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.extras[key]}
                  onChange={setExtra(key)}
                  className="mt-0.5 w-5 h-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                  <p className="text-xs font-semibold text-blue-600 mt-0.5">{price}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Price */}
          {km > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h2 className="font-semibold text-blue-900 mb-2">Precio estimado</h2>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-blue-700">
                  <span>{km} km × $3.500</span>
                  <span>{fmt.currency(km * 3500)}</span>
                </div>
                {form.extras.peon && (
                  <div className="flex justify-between text-blue-700">
                    <span>Peón</span>
                    <span>+$15.000</span>
                  </div>
                )}
                {form.extras.stairs && (
                  <div className="flex justify-between text-blue-700">
                    <span>Pasillos/escaleras</span>
                    <span>+$5.000</span>
                  </div>
                )}
                <div className="border-t border-blue-200 pt-1.5 flex justify-between font-bold text-blue-900 text-base">
                  <span>Total</span>
                  <span>{fmt.currency(price)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment timing */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-900">Momento de pago</h2>
            {[
              { val: 'before', label: 'Antes de cargar', emoji: '💳', desc: 'Pagás cuando el transportista llega' },
              { val: 'after', label: 'Después de descargar', emoji: '✅', desc: 'Pagás cuando recibís tu mercadería' },
            ].map(({ val, label, emoji, desc }) => (
              <label key={val} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value={val}
                  checked={form.paymentTiming === val}
                  onChange={() => setForm(f => ({ ...f, paymentTiming: val }))}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{emoji} {label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </label>
            ))}
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}

          <button onClick={handleNext}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-4 text-base transition-colors">
            Continuar →
          </button>
        </div>
      )}

      {/* Step 2: Select driver */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-1">Elegí un transportista</h2>
            <p className="text-sm text-gray-500 mb-4">Podés seleccionar uno o dejar que cualquier transportista tome tu solicitud</p>

            <button
              onClick={() => setForm(f => ({ ...f, selectedDriverId: null }))}
              className={`w-full p-3 rounded-xl border-2 text-left mb-3 transition-all ${
                form.selectedDriverId === null ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <p className="font-medium text-gray-900 text-sm">🌐 Cualquier transportista disponible</p>
              <p className="text-xs text-gray-500">Tu solicitud será visible para todos los transportistas online</p>
            </button>

            {onlineDrivers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-3xl mb-2">😔</p>
                <p className="text-sm text-gray-500">No hay transportistas online en este momento</p>
                <p className="text-xs text-gray-400 mt-1">Tu solicitud quedará disponible cuando alguien se conecte</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {onlineDrivers.length} transportista{onlineDrivers.length > 1 ? 's' : ''} online
                </p>
                {onlineDrivers.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setForm(f => ({ ...f, selectedDriverId: d.id }))}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      form.selectedDriverId === d.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                        {d.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm">{d.name}</p>
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                        <Stars value={d.rating} size={12} />
                        {d.vehicle && <p className="text-xs text-gray-500 mt-0.5">🚛 {d.vehicle}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-900">{d.ratingCount} viajes</p>
                        {form.selectedDriverId === d.id && <span className="text-blue-600 text-sm">✓</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleNext}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-4 text-base transition-colors">
            Continuar →
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-900">Resumen de tu solicitud</h2>
            <div className="space-y-2 text-sm">
              <SummaryRow label="📍 Origen" value={form.origin} />
              <SummaryRow label="🏁 Destino" value={form.destination} />
              <SummaryRow label="📏 Distancia" value={`${km} km`} />
              {form.extras.peon && <SummaryRow label="👷 Peón" value="+$15.000" />}
              {form.extras.stairs && <SummaryRow label="🏗️ Pasillos" value="+$5.000" />}
              <SummaryRow label="💳 Pago" value={form.paymentTiming === 'before' ? 'Antes de cargar' : 'Después de descargar'} />
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total estimado</span>
              <span className="text-2xl font-bold text-blue-600">{fmt.currency(price)}</span>
            </div>
          </div>

          {form.selectedDriverId && (() => {
            const d = db.users.find(form.selectedDriverId)
            return d ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">Transportista seleccionado</p>
                  <p className="text-sm text-green-700">{d.name}</p>
                </div>
              </div>
            ) : null
          })()}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ Recordá</p>
            <p className="text-xs text-amber-700">Asegurate de tener todo listo para cargar. El transportista tomará fotos del estado de la mercadería.</p>
          </div>

          <button onClick={handleConfirm}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-4 text-base transition-colors shadow-lg">
            🚛 Confirmar solicitud
          </button>
        </div>
      )}
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right max-w-[55%]">{value}</span>
    </div>
  )
}
