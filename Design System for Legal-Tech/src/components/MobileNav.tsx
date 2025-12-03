import React, { useState } from 'react';
import { Search, Bell, Menu, X, Home, FileText, BarChart3, BookOpen } from 'lucide-react';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      {/* Top Bar */}
      <nav className="bg-white border-b border-[--color-border] px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[--color-primary-600] rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L3 6V10C3 14.5 6.5 18.5 10 20C13.5 18.5 17 14.5 17 10V6L10 2Z" fill="white"/>
              </svg>
            </div>
            <span className="text-lg text-[--color-text-primary]">LegalTech AI</span>
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-[--color-neutral-100] rounded-lg transition-colors">
              <Search className="w-5 h-5 text-[--color-text-secondary]" />
            </button>
            <button className="p-2 hover:bg-[--color-neutral-100] rounded-lg transition-colors relative">
              <Bell className="w-5 h-5 text-[--color-text-secondary]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[--color-accent-error] rounded-full"></span>
            </button>
            <button 
              className="p-2 hover:bg-[--color-neutral-100] rounded-lg transition-colors"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <X className="w-5 h-5 text-[--color-text-secondary]" />
              ) : (
                <Menu className="w-5 h-5 text-[--color-text-secondary]" />
              )}
            </button>
          </div>
        </div>
      </nav>
      
      {/* Mobile Menu */}
      {isOpen && (
        <div className="bg-white border-b border-[--color-border] px-4 py-3">
          <div className="flex flex-col gap-2">
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-[--color-text-primary] bg-[--color-primary-50] rounded-lg">
              <Home className="w-5 h-5" />
              <span>Research</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-[--color-text-secondary] hover:bg-[--color-neutral-100] rounded-lg transition-colors">
              <FileText className="w-5 h-5" />
              <span>Documents</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-[--color-text-secondary] hover:bg-[--color-neutral-100] rounded-lg transition-colors">
              <BarChart3 className="w-5 h-5" />
              <span>Analytics</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-[--color-text-secondary] hover:bg-[--color-neutral-100] rounded-lg transition-colors">
              <BookOpen className="w-5 h-5" />
              <span>Knowledge Base</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}
