import React from 'react';
import { Bot, Sparkles, ShieldCheck } from 'lucide-react';
import { AssistantChat } from '../components/AssistantChat';

export const AssistantPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-tealAccent-50 text-tealAccent-800 text-xs font-semibold mb-3 border border-tealAccent-200 shadow-2xs">
          <Bot className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4E • Grounded AI Disposal Assistant
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900 tracking-tight sm:text-4xl">
          AI Pharmaceutical Disposal Assistant
        </h1>
        <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
          Evidence-grounded assistant answering medicine and packaging disposal questions. Grounded exclusively in approved health guidelines with verified source citations.
        </p>
      </div>

      {/* Main Full-Page Chat Window */}
      <div className="h-[680px]">
        <AssistantChat layoutMode="full" />
      </div>
    </div>
  );
};
