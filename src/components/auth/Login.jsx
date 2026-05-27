import { useState } from 'react'
import { useApp } from '../../context/AppContext'

export default function Login() {
  const { login, setScreen } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Completá todos los campos'); return }
    setLoading(true)
    try {
      login(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role) => {
    if (role === 'client') { setEmail('cliente@demo.com'); setPassword('demo123') }
    else { setEmail('transportista@demo.com'); setPassword('demo123') }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🚛</div>
          <h1 className="text-4xl font-bold text-white tracking-tight">FleteApp</h1>
          <p className="text-blue-200 mt-2 text-sm">Tu flete, rápido y seguro</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-5">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 transition-colors disabled:opacity-60"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-sm text-gray-500">¿No tenés cuenta? </span>
            <button
              onClick={() => setScreen('register')}
              className="text-sm text-blue-600 font-semibold hover:underline"
            >
              Registrarse
            </button>
          </div>
        </div>

        {/* Demo access */}
        <div className="mt-4 bg-white/10 backdrop-blur rounded-2xl p-4">
          <p className="text-blue-100 text-xs text-center font-medium mb-3">⚡ Acceso demo rápido</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fillDemo('client')}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-xl py-2 px-3 transition-colors"
            >
              👤 Soy Cliente
            </button>
            <button
              onClick={() => fillDemo('driver')}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-xl py-2 px-3 transition-colors"
            >
              🚛 Soy Transportista
            </button>
          </div>
          <p className="text-blue-200 text-xs text-center mt-2">Contraseña: demo123</p>
        </div>
      </div>
    </div>
  )
}
