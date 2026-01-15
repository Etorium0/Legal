import React, { useState } from 'react';
import { useAndroidBridge } from '../hooks/useAndroidBridge';
import { useAssistantChat } from '../hooks/useAssistantChat';
import { useUnitDetail } from '../hooks/useUnitDetail';
import { useProactiveGreeting } from '../hooks/useProactiveGreeting';
import { WelcomeScreen } from './assistant/WelcomeScreen';
import { ChatLayout } from './assistant/ChatLayout';

const AssistantPage: React.FC = () =>
{
  const [hasStarted, setHasStarted] = useState(true); // Auto-start for now to debug blank screen issue
  
  const {
    messages,
    inputText,
    setInputText,
    isLoading,
    isListening,
    setIsListening,
    isMuted,
    isSpeaking,
    setIsSpeaking,
    avatarVideoUrl,
    navigationDestination,
    setNavigationDestination,
    processingRef,
    handleSendMessage,
    handleMicClick,
    handleVideoEnd,
    toggleMute,
    loadSession
  } = useAssistantChat();

  const {
    showUnitModal,
    unitDetail,
    loadingUnit,
    fetchUnitDetail,
    closeUnitModal
  } = useUnitDetail();

  // Handle Android/WebView Events
  useAndroidBridge({
    isListening,
    setIsListening,
    setInputText,
    handleSendMessage: (text) => handleSendMessage(text),
    processingRef
  });

  // Proactive Greeting on Start
  useProactiveGreeting({
    hasStarted,
    setIsSpeaking
  });

  // Welcome Screen
  if (!hasStarted)
  {
    return <WelcomeScreen onStart={() => setHasStarted(true)} />;
  }

  return (
    <ChatLayout
      navigationDestination={navigationDestination}
      onCloseNavigation={() => setNavigationDestination(null)}
      showUnitModal={showUnitModal}
      unitDetail={unitDetail}
      loadingUnit={loadingUnit}
      onCloseUnitModal={closeUnitModal}
      isSpeaking={isSpeaking}
      isListening={isListening}
      avatarVideoUrl={avatarVideoUrl}
      onVideoEnd={handleVideoEnd}
      isMuted={isMuted}
      toggleMute={toggleMute}
      messages={messages}
      isLoading={isLoading}
      onSourceClick={fetchUnitDetail}
      inputText={inputText}
      setInputText={setInputText}
      handleSendMessage={handleSendMessage}
      handleMicClick={handleMicClick}
      onSelectSession={loadSession}
    />
  );
};

export default AssistantPage;
