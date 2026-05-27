import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'
import './index.css'

// Seed demo users if none exist
const USERS_KEY = 'flete_users'
if (!localStorage.getItem(USERS_KEY) || JSON.parse(localStorage.getItem(USERS_KEY)).length === 0) {
  const demo = [
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
      createdAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
    },
  ]
  localStorage.setItem(USERS_KEY, JSON.stringify(demo))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
)
