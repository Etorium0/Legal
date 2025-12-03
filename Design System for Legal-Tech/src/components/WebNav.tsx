import React from 'react';
import { Search, Bell, Settings, User } from 'lucide-react';

export function WebNav() {
  return (
    <nav className="bg-white border-b border-[--color-border] px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[--color-primary-600] rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L3 6V10C3 14.5 6.5 18.5 10 20C13.5 18.5 17 14.5 17 10V6L10 2Z" fill="white"/>
              </svg>
            </div>
            <span className="text-xl text-[--color-text-primary]">LegalTech AI</span>
          </div>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#" className="text-[--color-text-primary] hover:text-[--color-primary-600] transition-colors">
              Research
            </a>
            <a href="#" className="text-[--color-text-secondary] hover:text-[--color-primary-600] transition-colors">
              Documents
            </a>
            <a href="#" className="text-[--color-text-secondary] hover:text-[--color-primary-600] transition-colors">
              Analytics
            </a>
            <a href="#" className="text-[--color-text-secondary] hover:text-[--color-primary-600] transition-colors">
              Knowledge Base
            </a>
          </div>
        </div>
        
        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-[--color-neutral-100] rounded-lg transition-colors">
            <Search className="w-5 h-5 text-[--color-text-secondary]" />
          </button>
          <button className="p-2 hover:bg-[--color-neutral-100] rounded-lg transition-colors relative">
            <Bell className="w-5 h-5 text-[--color-text-secondary]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[--color-accent-error] rounded-full"></span>
          </button>
          <button className="p-2 hover:bg-[--color-neutral-100] rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-[--color-text-secondary]" />
          </button>
          <div className="w-px h-6 bg-[--color-border]"></div>
          <button className="flex items-center gap-2 p-2 hover:bg-[--color-neutral-100] rounded-lg transition-colors">
            <div className="w-8 h-8 bg-[--color-primary-100] rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-[--color-primary-600]" />
            </div>
            <span className="hidden lg:block text-sm text-[--color-text-primary]">John Doe</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
