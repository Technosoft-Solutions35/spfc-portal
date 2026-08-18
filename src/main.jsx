import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Punto de entrada de la SPA del portal SpFc/Gd
// Registro del service worker para notificaciones push (solo en http/https,
// no en file:// del desarrollo local).
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((reg) => {
      // Forzar comprobación de actualizaciones en cada carga de página.
      // Si hay un SW nuevo en el servidor, se instalará y activará (skipWaiting).
      reg.update().catch(() => {})
    }).catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
