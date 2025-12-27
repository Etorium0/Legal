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
import UnitDetailPage from './components/UnitDetailPage'
import PhapDienPage from './pages/PhapDienPage'
import VBPLPage from './pages/VBPLPage'
import VBPLDetailPage from './pages/VBPLDetailPage'

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
          <Route path="/phapdien" element={<ProtectedRoute><PhapDienPage /></ProtectedRoute>} />
          <Route path="/vbpl" element={<ProtectedRoute><VBPLPage /></ProtectedRoute>} />
          <Route path="/vbpl/:id" element={<ProtectedRoute><VBPLDetailPage /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><DocumentBrowserPage /></ProtectedRoute>} />
          <Route path="/graph" element={<ProtectedRoute><KnowledgeGraphPage /></ProtectedRoute>} />
          <Route path="/ingest" element={<ProtectedRoute><IngestPage /></ProtectedRoute>} />
          <Route path="/unit/:id" element={<ProtectedRoute><UnitDetailPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
