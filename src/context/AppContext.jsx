import { createContext, useContext, useState, useCallback } from 'react'
import { db, uid, notify, requestNotifyPermission } from '../utils/storage'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const s = db.session.get()
    if (!s) return null
    return db.users.find(s.id) || s
  })
  const [screen, setScreen] = useState('home')
  const [activeFreightId, setActiveFreightId] = useState(null)
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [dataVersion, setDataVersion] = useState(0)
  const [toasts, setToasts] = useState([])

  const bump = useCallback(() => setDataVersion(v => v + 1), [])

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

  const register = useCallback((data) => {
    const users = db.users.getAll()
    if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase()))
      throw new Error('El email ya está registrado')
    const user = {
      id: uid(), rating: 0, ratingCount: 0, online: false,
      createdAt: new Date().toISOString(), ...data,
    }
    db.users.save([...users, user])
    db.session.set(user)
    setCurrentUser(user)
    requestNotifyPermission()
    return user
  }, [])

  const logout = useCallback(() => {
    if (currentUser?.role === 'driver') db.users.update(currentUser.id, { online: false })
    db.session.clear()
    setCurrentUser(null)
    setScreen('home')
    setActiveFreightId(null)
    setSelectedRequestId(null)
  }, [currentUser])

  // --- User ---
  const updateUser = useCallback((patch) => {
    if (!currentUser) return
    db.users.update(currentUser.id, patch)
    const updated = { ...currentUser, ...patch }
    setCurrentUser(updated)
    db.session.set(updated)
    bump()
  }, [currentUser, bump])

  const toggleOnline = useCallback(() => {
    if (!currentUser) return
    const next = !currentUser.online
    updateUser({ online: next })
    addToast(next ? '🟢 Estás en línea' : '⚫ Estás offline', next ? 'success' : 'info')
  }, [currentUser, updateUser, addToast])

  // --- Freight ---
  const createFreight = useCallback((data) => {
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
    db.freights.save([...db.freights.getAll(), freight])
    bump()
    addToast('Solicitud enviada correctamente', 'success')
    return freight
  }, [currentUser, bump, addToast])

  const updateFreight = useCallback((id, patch) => {
    const prev = db.freights.find(id)
    db.freights.update(id, patch)
    bump()
    // Notify if status changed
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

  const cancelFreight = useCallback((freightId) => {
    updateFreight(freightId, { status: 'cancelled' })
    addToast('Solicitud cancelada', 'warning')
    setScreen('home')
    setActiveFreightId(null)
  }, [updateFreight, addToast])

  const addExtraCharge = useCallback((freightId, description, amount) => {
    const freight = db.freights.find(freightId)
    if (!freight) return
    const extras = [...(freight.extraCharges || []), { description, amount: Number(amount) }]
    const newPrice = freight.km * 3500 +
      (freight.extras?.peon ? 15000 : 0) +
      (freight.extras?.stairs ? 5000 : 0) +
      extras.reduce((s, c) => s + c.amount, 0)
    updateFreight(freightId, { extraCharges: extras, price: newPrice })
    addToast(`Cargo extra agregado: ${description}`, 'success')
  }, [updateFreight, addToast])

  // --- Messages ---
  const sendMessage = useCallback((freightId, content) => {
    const msg = {
      id: uid(), freightId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    }
    db.messages.save([...db.messages.getAll(), msg])
    bump()
    return msg
  }, [currentUser, bump])

  // --- Ratings ---
  const addRating = useCallback((freightId, ratedId, stars, justification = '') => {
    const rating = {
      id: uid(), freightId,
      raterId: currentUser.id,
      ratedId, stars, justification,
      timestamp: new Date().toISOString(),
    }
    const all = [...db.ratings.getAll(), rating]
    db.ratings.save(all)
    const userRatings = all.filter(r => r.ratedId === ratedId)
    const avg = userRatings.reduce((s, r) => s + r.stars, 0) / userRatings.length
    db.users.update(ratedId, { rating: Math.round(avg * 10) / 10, ratingCount: userRatings.length })
    if (ratedId === currentUser.id) syncUser(currentUser.id)
    bump()
    addToast('Calificación enviada', 'success')
    return rating
  }, [currentUser, bump, syncUser, addToast])

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
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
