import {
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot,
} from 'firebase/firestore'
import { firestoreDb } from '../firebase'

// In-memory cache — kept in sync by onSnapshot listeners
const _cache = { users: [], freights: [], messages: [], ratings: [] }

const DEMO_USERS = [
  {
    id: 'demo-client-1',
    name: 'Juan Pérez',
    email: 'cliente@demo.com',
    password: 'demo123',
    dni: '35.123.456',
    phone: '11-1234-5678',
    role: 'client',
    rating: 4.5,
    ratingCount: 8,
    online: false,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-driver-1',
    name: 'Carlos García',
    email: 'transportista@demo.com',
    password: 'demo123',
    dni: '28.654.321',
    phone: '11-8765-4321',
    role: 'driver',
    rating: 4.8,
    ratingCount: 15,
    online: false,
    vehicle: 'Ford Transit 2020',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]

export const initListeners = (onUpdate, onReady) => {
  const ready = { users: false, freights: false, messages: false, ratings: false }
  let readyCalled = false
  const checkReady = (key) => {
    if (ready[key]) return
    ready[key] = true
    if (!readyCalled && Object.values(ready).every(Boolean)) {
      readyCalled = true
      onReady?.()
    }
  }

  let usersSeeded = false
  const unsubUsers = onSnapshot(
    collection(firestoreDb, 'users'),
    snap => {
      _cache.users = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      if (!ready.users) {
        if (_cache.users.length === 0 && !usersSeeded) {
          usersSeeded = true
          Promise.all(DEMO_USERS.map(u => setDoc(doc(firestoreDb, 'users', u.id), u)))
            .catch(err => {
              console.warn('FleteApp: seed de usuarios falló —', err.message)
              checkReady('users') // proceed anyway so app doesn't hang
            })
          // Next snapshot (after seed) will call checkReady('users')
        } else {
          checkReady('users')
        }
      }
      onUpdate()
    },
    err => {
      console.warn('FleteApp: listener de usuarios falló —', err.message)
      checkReady('users')
    }
  )

  const makeListener = (colName, cacheKey) => onSnapshot(
    collection(firestoreDb, colName),
    snap => {
      _cache[cacheKey] = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      checkReady(cacheKey)
      onUpdate()
    },
    err => {
      console.warn(`FleteApp: listener de ${colName} falló —`, err.message)
      checkReady(cacheKey)
    }
  )

  const unsubFreights = makeListener('freights', 'freights')
  const unsubMessages = makeListener('messages', 'messages')
  const unsubRatings  = makeListener('ratings',  'ratings')

  return () => {
    unsubUsers()
    unsubFreights()
    unsubMessages()
    unsubRatings()
  }
}

export const db = {
  users: {
    getAll: () => _cache.users,
    find:   (id) => _cache.users.find(u => u.id === id) || null,
    create: (user) => setDoc(doc(firestoreDb, 'users', user.id), user),
    update: (id, patch) => updateDoc(doc(firestoreDb, 'users', id), patch),
  },
  freights: {
    getAll: () => _cache.freights,
    find:   (id) => _cache.freights.find(f => f.id === id) || null,
    create: (freight) => setDoc(doc(firestoreDb, 'freights', freight.id), freight),
    update: async (id, patch) => {
      const now = new Date().toISOString()
      const current = _cache.freights.find(f => f.id === id)
      const updated = { ...patch, updatedAt: now }
      if (patch.status && current && patch.status !== current.status) {
        updated.statusHistory = [
          ...(current.statusHistory || [{ status: current.status, timestamp: current.createdAt }]),
          { status: patch.status, timestamp: now },
        ]
      }
      await updateDoc(doc(firestoreDb, 'freights', id), updated)
    },
    delete: (id) => deleteDoc(doc(firestoreDb, 'freights', id)),
  },
  messages: {
    getAll:     () => _cache.messages,
    forFreight: (id) => _cache.messages.filter(m => m.freightId === id),
    create:     (msg) => setDoc(doc(firestoreDb, 'messages', msg.id), msg),
    delete:     (id) => deleteDoc(doc(firestoreDb, 'messages', id)),
  },
  ratings: {
    getAll:  () => _cache.ratings,
    forUser: (id) => _cache.ratings.filter(r => r.ratedId === id),
    create:  (rating) => setDoc(doc(firestoreDb, 'ratings', rating.id), rating),
  },
  session: {
    get:   () => { try { return JSON.parse(localStorage.getItem('flete_session')) } catch { return null } },
    set:   (u) => localStorage.setItem('flete_session', JSON.stringify({ id: u.id })),
    clear: () => localStorage.removeItem('flete_session'),
  },
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

export const fmt = {
  currency: (n) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0),
  date: (s) => new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  time: (s) => new Date(s).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  datetime: (s) => {
    const d = new Date(s)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' +
      d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  },
}

export const STATUS_LABELS = {
  pending:   'Esperando transportista',
  accepted:  'Transportista asignado',
  picking:   'Recogiendo carga',
  transit:   'En tránsito',
  delivered: 'Entregado',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export const STATUS_STEPS = ['pending', 'accepted', 'picking', 'transit', 'delivered']

export const STATUS_COLOR = {
  pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  accepted:  'bg-blue-100 text-blue-700 border-blue-200',
  picking:   'bg-purple-100 text-purple-700 border-purple-200',
  transit:   'bg-indigo-100 text-indigo-700 border-indigo-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-100 text-red-600 border-red-200',
}

export const calcPrice = (km, extras, extraCharges = []) => {
  let price = (km || 0) * 3500
  if (extras?.peon) price += 15000
  if (extras?.stairs) price += 5000
  price += extraCharges.reduce((s, c) => s + (c.amount || 0), 0)
  return price
}

export const notify = (title, body) => {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    try { new Notification(title, { body, icon: '/favicon.svg' }) } catch {}
  }
}

export const requestNotifyPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}
