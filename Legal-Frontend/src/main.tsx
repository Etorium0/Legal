import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const container = document.getElementById('root')!
const root = createRoot(container)
// Apply global dark theme
document.body.classList.add('theme-dark')
root.render(<App />)
