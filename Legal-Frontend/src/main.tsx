import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const container = document.getElementById('root')!
const root = createRoot(container)
// Apply global dark theme class for Tailwind
document.documentElement.classList.add('dark')
root.render(<App />)
