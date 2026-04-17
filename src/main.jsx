import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './ui/App.jsx'
import ReloadPrompt from './ui/components/common/ReloadPrompt.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ReloadPrompt />
  </StrictMode>,
)
