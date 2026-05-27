import { createContext, useContext, useState, useCallback } from 'react'
import { db, uid } from '../utils/storage'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const s = db.session.get()
    if (!s) return null
    // refresh from users list to get latest rating
    return db.users.find(s.id) || s
  })
  const [screen, setScreen] = useState('home')
  const [activeFreightId, setActiveFreightId] = useState(null)
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [dataVersion, setDataVersion] = useState(0)

  const bump = useCallback(() => setDataVersion(v => v + 1), [])

  const syncUser = useCallback((id) => {
    const fresh = db.users.find(id)
    if (fresh) {
      setCurrentUser(fresh)
      db.session.set(fresh)
    }
  }, [])

  // --- Auth ---
  const login = useCallback((email, password) => {
    const users = db.users.getAll()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
    if (!user) throw new Error('Email o contraseña incorrectos')
    db.session.set(user)
    setCurrentUser(user)
    return user
  }, [])

  const register = useCallback((data) => {
    const users = db.users.getAll()
    if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase()))
      throw new Error('El email ya está registrado')
    const user = {
      id: uid(),
      rating: 0,
      ratingCount: 0,
      online: false,
      createdAt: new Date().toISOString(),
      ...data,
    }
    db.users.save([...users, user])
    db.session.set(user)
    setCurrentUser(user)
    return user
  }, [])

  const logout = useCallback(() => {
    if (currentUser?.role === 'driver') {
      db.users.update(currentUser.id, { online: false })
    }
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
      clientRated: false,
      driverRated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    }
    const all = db.freights.getAll()
    db.freights.save([...all, freight])
    bump()
    return freight
  }, [currentUser, bump])

  const updateFreight = useCallback((id, patch) => {
    db.freights.update(id, patch)
    bump()
  }, [bump])

  // --- Messages ---
  const sendMessage = useCallback((freightId, content) => {
    const msg = {
      id: uid(),
      freightId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    }
    const all = db.messages.getAll()
    db.messages.save([...all, msg])
    bump()
    return msg
  }, [currentUser, bump])

  // --- Ratings ---
  const addRating = useCallback((freightId, ratedId, stars, justification = '') => {
    const rating = {
      id: uid(),
      freightId,
      raterId: currentUser.id,
      ratedId,
      stars,
      justification,
      timestamp: new Date().toISOString(),
    }
    const all = db.ratings.getAll()
    const updated = [...all, rating]
    db.ratings.save(updated)

    // recalculate user average
    const userRatings = updated.filter(r => r.ratedId === ratedId)
    const avg = userRatings.reduce((s, r) => s + r.stars, 0) / userRatings.length
    db.users.update(ratedId, { rating: Math.round(avg * 10) / 10, ratingCount: userRatings.length })

    if (ratedId === currentUser.id) syncUser(currentUser.id)
    bump()
    return rating
  }, [currentUser, bump, syncUser])

  const toggleOnline = useCallback(() => {
    if (!currentUser) return
    const next = !currentUser.online
    updateUser({ online: next })
  }, [currentUser, updateUser])

  return (
    <AppContext.Provider value={{
      currentUser,
      screen, setScreen,
      activeFreightId, setActiveFreightId,
      selectedRequestId, setSelectedRequestId,
      dataVersion, bump,
      login, register, logout,
      updateUser, syncUser,
      createFreight, updateFreight,
      sendMessage,
      addRating,
      toggleOnline,
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
