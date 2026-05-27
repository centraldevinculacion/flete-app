import { useState } from 'react'
import { useApp } from '../../context/AppContext'

export default function Register() {
  const { register, setScreen } = useApp()
  const [role, setRole] = useState('client')
  const [form, setForm] = useState({ name: '', email: '', password: '', dni: '', phone: '', vehicle: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const { name, email, password, dni, phone } = form
    if (!name || !email || !password || !dni || !phone) { setError('Completá todos los campos obligatorios'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    try {
      await register({ ...form, role })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-start py-8 px-6 overflow-y-auto">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🚛</div>
          <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {/* Role selector */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-3">¿Cómo querés usar FleteApp?</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 'client', label: 'Cliente', emoji: '📦', desc: 'Necesito enviar cosas' },
                { val: 'driver', label: 'Transportista', emoji: '🚛', desc: 'Tengo un vehículo' },
              ].map(r => (
                <button
                  key={r.val}
                  type="button"
                  onClick={() => setRole(r.val)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    role === r.val
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{r.emoji}</div>
                  <div className="font-semibold text-gray-900 text-sm">{r.label}</div>
                  <div className="text-xs text-gray-500">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {[
              { field: 'name', label: 'Nombre completo *', placeholder: 'Juan Pérez', type: 'text' },
              { field: 'email', label: 'Email *', placeholder: 'tu@email.com', type: 'email' },
              { field: 'password', label: 'Contraseña *', placeholder: 'Mínimo 6 caracteres', type: 'password' },
              { field: 'dni', label: 'DNI *', placeholder: '35.123.456', type: 'text' },
              { field: 'phone', label: 'Teléfono *', placeholder: '11-1234-5678', type: 'tel' },
            ].map(({ field, label, placeholder, type }) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[field]}
                  onChange={set(field)}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}

            {role === 'driver' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vehículo</label>
                <input
                  type="text"
                  value={form.vehicle}
                  onChange={set('vehicle')}
                  placeholder="ej: Ford Transit 2020"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-sm text-gray-500">¿Ya tenés cuenta? </span>
            <button
              onClick={() => setScreen('home')}
              className="text-sm text-blue-600 font-semibold hover:underline"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
