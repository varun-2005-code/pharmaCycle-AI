import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Sparkles, MessageSquare } from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';

export const FloatingChatLauncher: React.FC = () => {
  const { isDrawerOpen, toggleDrawer, activeContext } = useAssistant();
  const location = useLocation();

  // Hide launcher if already on full-page /assistant
  if (location.pathname === '/assistant') {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40">
      <button
        type="button"
        onClick={toggleDrawer}
        aria-label="Open AI Disposal Assistant"
        aria-expanded={isDrawerOpen}
        aria-controls="chat-drawer"
        data-testid="floating-chat-launcher"
        className="group relative inline-flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full bg-botanical-900 hover:bg-botanical-800 text-white shadow-xl shadow-botanical-900/30 transition-all duration-200 hover:scale-105 active:scale-95 border border-emerald-400/30 cursor-pointer"
      >
        {/* Context indicator badge */}
        {activeContext?.waste_category && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tealAccent-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-tealAccent-500 border-2 border-white" />
          </span>
        )}

        <div className="w-6 h-6 rounded-lg bg-tealAccent-600/30 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-tealAccent-400 group-hover:scale-110 transition-transform" />
        </div>

        <div className="flex flex-col text-left">
          <span className="text-xs sm:text-sm font-bold tracking-tight text-white leading-tight">
            Ask Assistant
          </span>
          {activeContext?.waste_category ? (
            <span className="text-[10px] text-tealAccent-300 truncate max-w-[120px] font-medium leading-none mt-0.5">
              {activeContext.waste_category}
            </span>
          ) : (
            <span className="text-[10px] text-tealAccent-300 font-medium leading-none mt-0.5 hidden sm:inline">
              Safe Disposal Help
            </span>
          )}
        </div>
      </button>
    </div>
  );
};
