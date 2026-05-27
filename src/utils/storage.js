const safeGet = (key, def) => {
  try {
    const v = localStorage.getItem(key)
    return v != null ? JSON.parse(v) : def
  } catch { return def }
}
const safeSet = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch (e) { console.error('Storage error', e) }
}

export const db = {
  users: {
    getAll: () => safeGet('flete_users', []),
    save: (v) => safeSet('flete_users', v),
    find: (id) => safeGet('flete_users', []).find(u => u.id === id) || null,
    update: (id, patch) => {
      const all = safeGet('flete_users', [])
      safeSet('flete_users', all.map(u => u.id === id ? { ...u, ...patch } : u))
    },
  },
  freights: {
    getAll: () => safeGet('flete_freights', []),
    save: (v) => safeSet('flete_freights', v),
    find: (id) => safeGet('flete_freights', []).find(f => f.id === id) || null,
    update: (id, patch) => {
      const all = safeGet('flete_freights', [])
      const now = new Date().toISOString()
      safeSet('flete_freights', all.map(f => {
        if (f.id !== id) return f
        const updated = { ...f, ...patch, updatedAt: now }
        // append to status history when status changes
        if (patch.status && patch.status !== f.status) {
          updated.statusHistory = [
            ...(f.statusHistory || [{ status: f.status, timestamp: f.createdAt }]),
            { status: patch.status, timestamp: now },
          ]
        }
        return updated
      }))
    },
  },
  messages: {
    getAll: () => safeGet('flete_messages', []),
    save: (v) => safeSet('flete_messages', v),
    forFreight: (id) => safeGet('flete_messages', []).filter(m => m.freightId === id),
  },
  ratings: {
    getAll: () => safeGet('flete_ratings', []),
    save: (v) => safeSet('flete_ratings', v),
    forUser: (id) => safeGet('flete_ratings', []).filter(r => r.ratedId === id),
  },
  session: {
    get: () => safeGet('flete_session', null),
    set: (u) => safeSet('flete_session', u),
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
