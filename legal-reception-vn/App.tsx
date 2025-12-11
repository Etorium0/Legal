
import React, { useState } from 'react';
import { LayoutDashboard, MessageSquare, FileText, Activity, Settings, User, Power, Mic } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import AvatarView from './components/AvatarView';
import GraphView from './components/GraphView';
import { AppView, Triple, LegalDocument } from './types';
import { getMockDocuments } from './services/legalService';

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false); // New state for Autoplay policy
  const [currentView, setCurrentView] = useState<AppView>(AppView.ASSISTANT);
  const [currentTriples, setCurrentTriples] = useState<Triple[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);

  const handleVideoEnd = () => {
    setAvatarVideoUrl(null);
    setIsSpeaking(false);
  };

  // Welcome Screen to bypass AudioContext restrictions
  if (!hasStarted) {
    return (
      <div className="h-screen w-full bg-darker flex flex-col items-center justify-center text-white relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-darker to-darker z-0"></div>
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse z-0"></div>
        
        <div className="z-10 flex flex-col items-center space-y-8 p-4 text-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-blue-500/30 flex items-center justify-center animate-[spin_10s_linear_infinite]">
              <div className="w-24 h-24 rounded-full border-t-4 border-blue-400"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
               <Mic className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              Legal Reception VN
            </h1>
            <p className="text-gray-400 text-lg max-w-md mx-auto">
              Trợ lý pháp luật ảo với khả năng tương tác giọng nói tự nhiên.
            </p>
          </div>

          <button 
            onClick={() => setHasStarted(true)}
            className="group relative px-8 py-4 bg-white text-darker font-bold rounded-full text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] hover:scale-105 transition-all duration-300 flex items-center gap-3"
          >
            <Power className="w-5 h-5 group-hover:text-blue-600 transition-colors" />
            Bắt đầu Tư vấn
          </button>
          
          <p className="text-xs text-gray-600 mt-8">
            Bấm "Bắt đầu" để kích hoạt Microphone và Loa
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case AppView.DOCUMENTS:
        const docs = getMockDocuments();
        return (
          <div className="p-6 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-white">Văn bản Pháp luật (Mock DB)</h2>
            <div className="grid gap-4 pb-20">
              {docs.map((doc: LegalDocument) => (
                <div key={doc.id} className="bg-surface p-4 rounded-lg border border-gray-700 hover:border-primary transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-blue-400">{doc.number}</h3>
                      <p className="text-gray-300 font-medium">{doc.title}</p>
                    </div>
                    <span className="bg-green-900/50 text-green-400 text-xs px-2 py-1 rounded border border-green-800">
                      {doc.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-4 text-sm text-gray-500">
                    <span>Ban hành: {doc.issued_by}</span>
                    <span>Hiệu lực: {doc.effective_date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case AppView.GRAPH:
        return (
          <div className="h-full p-4 flex flex-col">
             <h2 className="text-2xl font-bold mb-4 text-white">Biểu đồ Tri thức (Knowledge Graph)</h2>
             <div className="flex-1 min-h-[500px] lg:min-h-0 bg-darker rounded-xl border border-gray-700">
               <GraphView triples={currentTriples} />
             </div>
          </div>
        );

      case AppView.SETTINGS:
        return (
           <div className="p-8 flex items-center justify-center h-full text-gray-400">
             <div className="text-center">
               <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
               <p>Cài đặt hệ thống đang được phát triển.</p>
             </div>
           </div>
        );

      case AppView.ASSISTANT:
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 h-auto lg:h-full">
            {/* Left Col: Avatar & Visuals */}
            <div className="lg:col-span-5 flex flex-col gap-6 h-auto lg:h-full min-h-[400px]">
              <div className="flex-1 min-h-[300px] lg:min-h-0">
                <AvatarView 
                  isSpeaking={isSpeaking} 
                  isListening={isListening} 
                  videoUrl={avatarVideoUrl}
                  onVideoEnd={handleVideoEnd}
                />
              </div>
              <div className="h-64 hidden lg:block bg-darker rounded-xl border border-gray-700">
                 <GraphView triples={currentTriples} />
              </div>
            </div>
            
            {/* Right Col: Chat */}
            <div className="lg:col-span-7 h-[600px] lg:h-full">
              <ChatInterface 
                onNewTriples={(t) => setCurrentTriples(t)} 
                setGlobalIsSpeaking={setIsSpeaking}
                setGlobalIsListening={setIsListening}
                setAvatarVideoUrl={setAvatarVideoUrl}
                autoStart={hasStarted} // Pass signal to auto-greet
              />
            </div>
          </div>
        );
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all ${
        currentView === view 
          ? 'bg-primary/20 text-primary border-r-2 border-primary' 
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden selection:bg-primary/30">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-darker border-r border-gray-800 hidden md:flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-gradient-to-tr from-primary to-secondary rounded-lg"></div>
             <h1 className="text-xl font-bold tracking-tight">Legal VN</h1>
          </div>
          <p className="text-xs text-gray-500 mt-2">Hệ thống Lễ tân Ảo 1.0</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem view={AppView.ASSISTANT} icon={MessageSquare} label="Trợ lý ảo" />
          <NavItem view={AppView.DOCUMENTS} icon={FileText} label="Văn bản luật" />
          <NavItem view={AppView.GRAPH} icon={Activity} label="Đồ thị tri thức" />
          <NavItem view={AppView.SETTINGS} icon={Settings} label="Cài đặt" />
        </nav>

        <div className="p-4 border-t border-gray-800 mt-auto">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <div className="bg-gray-600 p-2 rounded-full">
               <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">Khách truy cập</p>
              <p className="text-xs text-green-500">● Online</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        {/* Mobile Header */}
        <div className="md:hidden h-16 bg-darker border-b border-gray-800 flex items-center px-4 justify-between flex-shrink-0 z-20">
           <span className="font-bold">Legal Reception VN</span>
           <div className="flex gap-2">
             <button onClick={() => setCurrentView(AppView.ASSISTANT)} className={`p-2 rounded ${currentView === AppView.ASSISTANT ? 'bg-primary text-white' : 'bg-gray-700'}`}>
               <MessageSquare className="w-5 h-5"/>
             </button>
             <button onClick={() => setCurrentView(AppView.GRAPH)} className={`p-2 rounded ${currentView === AppView.GRAPH ? 'bg-primary text-white' : 'bg-gray-700'}`}>
               <Activity className="w-5 h-5"/>
             </button>
           </div>
        </div>
        
        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden relative w-full">
           {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
