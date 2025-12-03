import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './components/DashboardPage';
import { DocumentBrowserPage } from './components/DocumentBrowserPage';
import { KnowledgeGraphPage } from './components/KnowledgeGraphPage';
import { SettingsPage } from './components/SettingsPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  // Landing and Login pages (no sidebar)
  if (currentPage === 'landing') {
    return <LandingPage onNavigate={handleNavigate} />;
  }

  if (currentPage === 'login') {
    return <LoginPage onNavigate={handleNavigate} />;
  }

  // Dashboard pages (with sidebar)
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
      
      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'ask' && <DashboardPage />}
      {currentPage === 'documents' && <DocumentBrowserPage />}
      {currentPage === 'knowledge-graph' && <KnowledgeGraphPage />}
      {currentPage === 'settings' && <SettingsPage />}
    </div>
  );
}
