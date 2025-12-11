import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import DocumentBrowserPage from './components/DocumentBrowserPage'
import KnowledgeGraphPage from './components/KnowledgeGraphPage'
import SettingsPage from './components/SettingsPage'
import LoginPage from './components/LoginPage'
import DashboardPage from './components/DashboardPage'
import AssistantPageEnhanced from './components/AssistantPageEnhanced'

const App: React.FC = () => 
{
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/assistant" replace />} />
        <Route path="/assistant" element={<AssistantPageEnhanced />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/documents" element={<DocumentBrowserPage />} />
        <Route path="/graph" element={<KnowledgeGraphPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
