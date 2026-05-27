import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { db, uid, notify, requestNotifyPermission, initListeners } from '../utils/storage'

const AppContext = createContext(null)

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="text-6xl mb-4">🚛</div>
        <p className="text-xl font-semibold">FleteApp</p>
        <p className="text-blue-200 text-sm mt-2">Conectando con Firebase...</p>
        <div className="mt-4 flex justify-center gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function AppProvider({ children }) {
  const [loading, setLoading]                   = useState(true)
  const [currentUser, setCurrentUser]           = useState(null)
  const [screen, setScreen]                     = useState('home')
  const [activeFreightId, setActiveFreightId]   = useState(null)
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [dataVersion, setDataVersion]           = useState(0)
  const [toasts, setToasts]                     = useState([])

  const bump = useCallback(() => setDataVersion(v => v + 1), [])

  // Subscribe to all Firestore collections on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const unsub = initListeners(bump, () => {
      const session = db.session.get()
      if (session?.id) {
        const user = db.users.find(session.id)
        if (user) setCurrentUser(user)
      }
      setLoading(false)
    })
    return unsub
  }, []) // intentionally empty — initListeners subscription runs once

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = uid()
    setToasts(t => [...t, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const syncUser = useCallback((id) => {
    const fresh = db.users.find(id)
    if (fresh) { setCurrentUser(fresh); db.session.set(fresh) }
  }, [])

  // --- Auth ---
  const login = useCallback((email, password) => {
    const user = db.users.getAll().find(u =>
      u.email.toLowerCase() === email.toLowerCase() && u.password === password)
    if (!user) throw new Error('Email o contraseña incorrectos')
    db.session.set(user)
    setCurrentUser(user)
    requestNotifyPermission()
    return user
  }, [])

  const register = useCallback(async (data) => {
    const users = db.users.getAll()
    if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase()))
      throw new Error('El email ya está registrado')
    const user = {
      id: uid(), rating: 0, ratingCount: 0, online: false,
      createdAt: new Date().toISOString(), ...data,
    }
    await db.users.create(user)
    db.session.set(user)
    setCurrentUser(user)
    requestNotifyPermission()
    return user
  }, [])

  const logout = useCallback(async () => {
    if (currentUser?.role === 'driver') await db.users.update(currentUser.id, { online: false })
    db.session.clear()
    setCurrentUser(null)
    setScreen('home')
    setActiveFreightId(null)
    setSelectedRequestId(null)
  }, [currentUser])

  // --- User ---
  const updateUser = useCallback(async (patch) => {
    if (!currentUser) return
    await db.users.update(currentUser.id, patch)
    const updated = { ...currentUser, ...patch }
    setCurrentUser(updated)
    db.session.set(updated)
    bump()
  }, [currentUser, bump])

  const toggleOnline = useCallback(async () => {
    if (!currentUser) return
    const next = !currentUser.online
    await updateUser({ online: next })
    addToast(next ? '🟢 Estás en línea' : '⚫ Estás offline', next ? 'success' : 'info')
  }, [currentUser, updateUser, addToast])

  // --- Freight ---
  const createFreight = useCallback(async (data) => {
    const freight = {
      id: uid(),
      clientId: currentUser.id,
      driverId: null,
      status: 'pending',
      photos: [],
      clientConfirmed: false,
      cargoCondition: [],
      observations: '',
      extraCharges: [],
      clientRated: false,
      driverRated: false,
      statusHistory: [{ status: 'pending', timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    }
    await db.freights.create(freight)
    bump()
    addToast('Solicitud enviada correctamente', 'success')
    return freight
  }, [currentUser, bump, addToast])

  const updateFreight = useCallback(async (id, patch) => {
    const prev = db.freights.find(id)
    await db.freights.update(id, patch)
    bump()
    if (patch.status && prev && patch.status !== prev.status) {
      const labels = {
        accepted:  '🚛 ¡Transportista asignado!',
        picking:   '📦 El transportista llegó al punto de carga',
        transit:   '🚗 Tu carga está en tránsito',
        delivered: '✅ ¡Entrega completada!',
        cancelled: '❌ Flete cancelado',
      }
      if (labels[patch.status]) notify('FleteApp', labels[patch.status])
    }
  }, [bump])

  const cancelFreight = useCallback(async (freightId) => {
    await updateFreight(freightId, { status: 'cancelled' })
    addToast('Solicitud cancelada', 'warning')
    setScreen('home')
    setActiveFreightId(null)
  }, [updateFreight, addToast])

  const addExtraCharge = useCallback(async (freightId, description, amount) => {
    const freight = db.freights.find(freightId)
    if (!freight) return
    const extras = [...(freight.extraCharges || []), { description, amount: Number(amount) }]
    const newPrice = freight.km * 3500 +
      (freight.extras?.peon ? 15000 : 0) +
      (freight.extras?.stairs ? 5000 : 0) +
      extras.reduce((s, c) => s + c.amount, 0)
    await updateFreight(freightId, { extraCharges: extras, price: newPrice })
    addToast(`Cargo extra agregado: ${description}`, 'success')
  }, [updateFreight, addToast])

  // --- Messages ---
  const sendMessage = useCallback(async (freightId, content) => {
    const msg = {
      id: uid(), freightId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    }
    await db.messages.create(msg)
    bump()
    return msg
  }, [currentUser, bump])

  // --- Ratings ---
  const addRating = useCallback(async (freightId, ratedId, stars, justification = '') => {
    const rating = {
      id: uid(), freightId,
      raterId: currentUser.id,
      ratedId, stars, justification,
      timestamp: new Date().toISOString(),
    }
    await db.ratings.create(rating)
    // Compute average including the new rating (not yet in cache)
    const allRatings = [...db.ratings.getAll(), rating]
    const userRatings = allRatings.filter(r => r.ratedId === ratedId)
    const avg = Math.round(userRatings.reduce((s, r) => s + r.stars, 0) / userRatings.length * 10) / 10
    await db.users.update(ratedId, { rating: avg, ratingCount: userRatings.length })
    if (ratedId === currentUser.id) {
      const updated = { ...currentUser, rating: avg, ratingCount: userRatings.length }
      setCurrentUser(updated)
      db.session.set(updated)
    }
    bump()
    addToast('Calificación enviada', 'success')
    return rating
  }, [currentUser, bump, addToast])

  return (
    <AppContext.Provider value={{
      currentUser,
      screen, setScreen,
      activeFreightId, setActiveFreightId,
      selectedRequestId, setSelectedRequestId,
      dataVersion, bump,
      toasts, addToast, removeToast,
      login, register, logout,
      updateUser, syncUser, toggleOnline,
      createFreight, updateFreight, cancelFreight,
      addExtraCharge,
      sendMessage,
      addRating,
    }}>
      {loading ? <LoadingScreen /> : children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
