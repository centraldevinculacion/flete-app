import { useEffect, useState } from 'react'

const ICONS = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
}

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onRemove, 300)
    }, toast.duration || 3000)
    return () => clearTimeout(t)
  }, [])

  const bg = {
    success: 'bg-green-600',
    error:   'bg-red-600',
    info:    'bg-blue-600',
    warning: 'bg-amber-500',
  }[toast.type || 'info']

  return (
    <div className={`flex items-center gap-2.5 ${bg} text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium
      transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
      <span>{ICONS[toast.type || 'info']}</span>
      <span>{toast.message}</span>
    </div>
  )
}

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-[400px] px-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={() => onRemove(t.id)} />
      ))}
    </div>
  )
}
