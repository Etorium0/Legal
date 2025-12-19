import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import DocumentBrowserPage from './components/DocumentBrowserPage'
import KnowledgeGraphPage from './components/KnowledgeGraphPage'
import SettingsPage from './components/SettingsPage'
import LoginPage from './components/LoginPage'
import DashboardPage from './components/DashboardPage'
import AssistantPageEnhanced from './components/AssistantPageEnhanced'
import { AuthProvider } from './components/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import IngestPage from './components/IngestPage'

const App: React.FC = () => 
{
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/assistant" replace />} />
          <Route path="/assistant" element={<ProtectedRoute><AssistantPageEnhanced /></ProtectedRoute>} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><DocumentBrowserPage /></ProtectedRoute>} />
          <Route path="/graph" element={<ProtectedRoute><KnowledgeGraphPage /></ProtectedRoute>} />
          <Route path="/ingest" element={<ProtectedRoute><IngestPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
