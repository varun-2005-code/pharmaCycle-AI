import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { AssistantProvider } from '../context/AssistantContext';
import { FloatingChatLauncher } from './FloatingChatLauncher';
import { ChatDrawer } from './ChatDrawer';

export const Layout: React.FC = () => {
  return (
    <AssistantProvider>
      <div className="min-h-screen flex flex-col bg-offwhite text-slate-800 relative">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />

        {/* Global Assistant floating launcher & drawer */}
        <FloatingChatLauncher />
        <ChatDrawer />
      </div>
    </AssistantProvider>
  );
};
