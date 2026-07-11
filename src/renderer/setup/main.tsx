import { createRoot } from 'react-dom/client'
import { SetupApp } from './SetupApp'
import './setup.css'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<SetupApp />)
}
