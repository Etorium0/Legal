import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import LandingPage from './components/LandingPage'
import DocumentBrowserPage from './components/DocumentBrowserPage'
import KnowledgeGraphPage from './components/KnowledgeGraphPage'
import SettingsPage from './components/SettingsPage'
import LoginPage from './components/LoginPage'
import WebNav from './components/WebNav'
import DashboardPage from './components/DashboardPage'
import VirtualReceptionist from './VirtualReceptionist'

// Pages imported from local components (ported from design)

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  return (
    <div className="min-h-screen">
      <WebNav onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="flex">
        <Sidebar open={sidebarOpen} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Make assistant the default landing */}
        <Route path="/" element={<Navigate to="/assistant" replace />} />
        <Route path="/home" element={<Layout><LandingPage /></Layout>} />
        <Route path="/assistant" element={<Layout><VirtualReceptionist /></Layout>} />
        <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />
        <Route path="/documents" element={<Layout><DocumentBrowserPage /></Layout>} />
        <Route path="/graph" element={<Layout><KnowledgeGraphPage /></Layout>} />
        <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
