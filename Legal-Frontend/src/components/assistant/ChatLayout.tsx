import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, History } from 'lucide-react';
import SidebarDark from '../SidebarDark';
import HeaderBar from '../HeaderBar';
import AvatarView from '../AvatarView';
import NavigationMap from '../NavigationMap';
import { UnitDetailModal } from './UnitDetailModal';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import { Message } from '../../types';
import { UnitDetail } from '../../components/document-browser/types';

interface ChatLayoutProps {
  // Navigation
  navigationDestination: string | null;
  onCloseNavigation: () => void;

  // Unit Detail Modal
  showUnitModal: boolean;
  unitDetail: UnitDetail | null;
  loadingUnit: boolean;
  onCloseUnitModal: () => void;

  // Avatar
  isSpeaking: boolean;
  isListening: boolean;
  avatarVideoUrl: string;
  onVideoEnd: () => void;

  // Chat Control
  isMuted: boolean;
  toggleMute: () => void;

  // Chat Content
  messages: Message[];
  isLoading: boolean;
  onSourceClick: (id: string) => void;

  // Chat Input
  inputText: string;
  setInputText: (text: string) => void;
  handleSendMessage: (text: string) => void;
  handleMicClick: () => void;

  // Chat History
  onSelectSession?: (sessionId: string) => void;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  navigationDestination,
  onCloseNavigation,
  showUnitModal,
  unitDetail,
  loadingUnit,
  onCloseUnitModal,
  isSpeaking,
  isListening,
  avatarVideoUrl,
  onVideoEnd,
  isMuted,
  toggleMute,
  messages,
  isLoading,
  onSourceClick,
  inputText,
  setInputText,
  handleSendMessage,
  handleMicClick,
  onSelectSession,
}) =>
{
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="dark min-h-screen flex flex-col pb-20 sm:pb-0">
      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectSession={onSelectSession}
      />

      {/* Navigation Map Overlay */}
      {navigationDestination && (
        <NavigationMap
          destination={navigationDestination}
          onClose={onCloseNavigation}
        />
      )}

      {/* Law Detail Modal */}
      <UnitDetailModal
        isOpen={showUnitModal}
        onClose={onCloseUnitModal}
        loading={loadingUnit}
        unitDetail={unitDetail}
      />
      
      <div className="min-h-screen bg-[#0C0F14] text-white flex-1 flex flex-col">
        <div className="flex flex-1">
          <SidebarDark />
          <div className="flex-1 min-h-screen flex flex-col pb-16 sm:pb-0">
            <HeaderBar />
            
            <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
              <div className="lg:w-1/3 min-h-[300px] lg:min-h-0">
                <AvatarView
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                  videoUrl={avatarVideoUrl}
                  onVideoEnd={onVideoEnd}
                />
              </div>

              <div className="lg:w-2/3 flex flex-col bg-surface/50 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 bg-darker/80 border-b border-white/5 flex justify-between items-center backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-gray-200 tracking-wide uppercase">Lịch sử hội thoại</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowHistory(true)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      title="Xem lịch sử chat"
                    >
                      <History className="w-4 h-4 text-gray-400 hover:text-primary" />
                    </button>
                    <button
                      onClick={toggleMute}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-primary" />}
                    </button>
                  </div>
                </div>

                <MessageList 
                  messages={messages} 
                  isLoading={isLoading} 
                  onSourceClick={onSourceClick} 
                />

                <ChatInput
                  inputText={inputText}
                  setInputText={setInputText}
                  handleSendMessage={handleSendMessage}
                  isListening={isListening}
                  isLoading={isLoading}
                  handleMicClick={handleMicClick}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
