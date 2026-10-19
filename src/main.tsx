import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import '@brand/theme.css'
import App from './App.tsx'
import { StoreProvider } from './store.tsx'

// Mode hors ligne + mise à jour automatique quand une nouvelle version est publiée
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
