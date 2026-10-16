import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ChatContext } from '../types';

interface AssistantContextType {
  isDrawerOpen: boolean;
  openDrawer: (initialQuery?: string) => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  activeContext: ChatContext | null;
  setWasteContext: (category: string, summary?: string, expiryStatus?: string) => void;
  clearWasteContext: () => void;
  initialQuery: string | null;
  clearInitialQuery: () => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | null>(null);
  const [activeContext, setActiveContextState] = useState<ChatContext | null>(() => {
    try {
      const saved = sessionStorage.getItem('pharmacycle_assistant_ctx');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const openDrawer = useCallback((query?: string) => {
    if (query) {
      setInitialQuery(query);
    }
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  const setWasteContext = useCallback((category: string, summary?: string, expiryStatus?: string) => {
    const ctx: ChatContext = {
      waste_category: category,
      analysis_summary: summary,
      expiry_status: expiryStatus,
      page: window.location.pathname
    };
    setActiveContextState(ctx);
    try {
      sessionStorage.setItem('pharmacycle_assistant_ctx', JSON.stringify(ctx));
    } catch {
      // ignore storage errors
    }
  }, []);

  const clearWasteContext = useCallback(() => {
    setActiveContextState(null);
    try {
      sessionStorage.removeItem('pharmacycle_assistant_ctx');
    } catch {
      // ignore storage errors
    }
  }, []);

  const clearInitialQuery = useCallback(() => {
    setInitialQuery(null);
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        activeContext,
        setWasteContext,
        clearWasteContext,
        initialQuery,
        clearInitialQuery
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = (): AssistantContextType => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};
