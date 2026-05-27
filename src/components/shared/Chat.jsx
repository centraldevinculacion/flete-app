import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { db, fmt } from '../../utils/storage'

export default function Chat() {
  const { currentUser, sendMessage, dataVersion, activeFreightId } = useApp()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [freight, setFreight] = useState(null)
  const bottomRef = useRef(null)

  // Find the active freight for this user
  const getFreight = () => {
    const all = db.freights.getAll()
    if (activeFreightId) return all.find(f => f.id === activeFreightId) || null
    if (currentUser.role === 'client') {
      return all.find(f => f.clientId === currentUser.id && ['pending','accepted','picking','transit','delivered'].includes(f.status)) || null
    } else {
      return all.find(f => f.driverId === currentUser.id && ['accepted','picking','transit','delivered'].includes(f.status)) || null
    }
  }

  useEffect(() => {
    const f = getFreight()
    setFreight(f)
    if (f) setMessages(db.messages.forFreight(f.id))
  }, [dataVersion, activeFreightId])

  // Poll for new messages
  useEffect(() => {
    const iv = setInterval(() => {
      const f = getFreight()
      if (f) setMessages(db.messages.forFreight(f.id))
    }, 2000)
    return () => clearInterval(iv)
  }, [activeFreightId, currentUser.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!text.trim() || !freight) return
    sendMessage(freight.id, text)
    setText('')
  }

  if (!freight) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
        <div className="text-5xl">💬</div>
        <div className="text-center">
          <p className="font-semibold text-gray-700">Sin conversación activa</p>
          <p className="text-sm text-gray-500 mt-1">El chat se habilita cuando tenés un flete activo</p>
        </div>
      </div>
    )
  }

  const otherUserId = currentUser.role === 'client' ? freight.driverId : freight.clientId
  const otherUser = otherUserId ? db.users.find(otherUserId) : null

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
          {otherUser ? otherUser.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '?'}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{otherUser?.name || 'Esperando...'}</p>
          <p className="text-xs text-gray-500">
            {otherUser ? (currentUser.role === 'client' ? 'Transportista' : 'Cliente') : 'Sin asignar'}
          </p>
        </div>
        <div className="ml-auto text-xs text-gray-400">
          {freight.origin} → {freight.destination}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">No hay mensajes aún. ¡Iniciá la conversación!</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.senderId === currentUser.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm shadow-sm'
              }`}>
                {!isMe && (
                  <p className="text-xs font-medium text-blue-600 mb-0.5">{msg.senderName}</p>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'} text-right`}>
                  {fmt.time(msg.timestamp)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-3">
        {!otherUser && (
          <p className="text-xs text-center text-gray-400 mb-2">Esperando que se asigne un transportista...</p>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={!otherUser}
            placeholder={otherUser ? 'Escribí un mensaje...' : 'Chat no disponible aún'}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={!text.trim() || !otherUser}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
