import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Maximize2, Bot } from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';
import { AssistantChat } from './AssistantChat';

export const ChatDrawer: React.FC = () => {
  const { isDrawerOpen, closeDrawer } = useAssistant();
  const navigate = useNavigate();
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isDrawerOpen) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDrawer();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on close button or input box
    const timer = setTimeout(() => {
      const inputEl = drawerRef.current?.querySelector<HTMLElement>('textarea, button');
      inputEl?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      previouslyFocusedElement.current?.focus();
    };
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="AI Disposal Assistant Drawer"
      data-testid="chat-drawer"
    >
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 w-full sm:w-[460px] md:w-[500px] bg-white shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out border-l border-emerald-100"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-botanical-900 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-tealAccent-600/30 border border-tealAccent-400/40 flex items-center justify-center">
              <Bot className="w-5 h-5 text-tealAccent-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight leading-none">
                AI Disposal Assistant
              </h2>
              <span className="text-[10px] text-tealAccent-200">
                Grounded Pharmaceutical Guidance
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                closeDrawer();
                navigate('/assistant');
              }}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Open assistant in full page"
              title="Open full page"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close assistant drawer"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body: Shared AssistantChat Component */}
        <div className="flex-1 overflow-hidden">
          <AssistantChat layoutMode="drawer" onCloseDrawer={closeDrawer} />
        </div>
      </div>
    </div>
  );
};
