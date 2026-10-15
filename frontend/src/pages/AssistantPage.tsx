import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  AlertOctagon,
  User,
  MessageSquare,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import type { ChatMessage, ChatResponse } from '../types';

const INITIAL_SUGGESTIONS = [
  'How should I dispose of expired tablets?',
  'Can I put an empty blister pack in a plastic recycling bin?',
  'How do I read the expiry date on this medicine?',
  'What should I do if the expiry date is unreadable?',
  'Can I flush liquid antibiotics down the toilet?'
];

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your **PharmaCycle AI Disposal Assistant**. I provide evidence-grounded instructions for safely disposing of medicines and recycling pharmaceutical packaging based on approved health and environmental standards.\n\nHow can I help you today?',
      sources: [
        { title: 'WHO Safe Medical Waste Guidance', url: 'https://www.who.int' },
        { title: 'FDA Safe Medicine Disposal', url: 'https://www.fda.gov/drugs/safe-disposal-medicines' }
      ],
      disclaimer: 'Grounded in health authority guidance. Decoupled from unconstrained LLM hallucinations.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data: ChatResponse = await res.json();

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        sources: data.sources,
        disclaimer: data.disclaimer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (data.suggestions && data.suggestions.length > 0) {
        setActiveSuggestions(data.suggestions);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          '⚠️ Sorry, I encountered a temporary connection issue while querying the disposal guidance base. Please try again or consult the [Disposal Guide](/guide).',
        disclaimer: 'Connection error fallback',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-tealAccent-50 text-tealAccent-800 text-xs font-semibold mb-3 border border-tealAccent-200">
          <Bot className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4E • Grounded AI Disposal Assistant
        </div>
        <h1 className="text-3xl font-extrabold text-botanical-900">
          AI Pharmaceutical Disposal Assistant
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Interactive chat assistant answering packaging disposal queries, grounded in approved health authority guidelines with verified source citations.
        </p>
      </div>

      {/* Main Chat Window */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-soft overflow-hidden flex flex-col h-[640px]">
        {/* Chat Status Bar */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-botanical-900">Grounded Guidance Engine</span>
            <span className="text-[10px] text-slate-400">| Rules & Retrieval Mode</span>
          </div>
          <button
            onClick={() => {
              setMessages([messages[0]]);
              setActiveSuggestions(INITIAL_SUGGESTIONS);
            }}
            className="text-[11px] text-slate-500 hover:text-botanical-900 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Clear History
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 items-start ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-botanical-900 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                  <Bot className="w-4 h-4 text-tealAccent-400" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                  msg.role === 'user'
                    ? 'bg-botanical-900 text-white rounded-tr-none'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none'
                }`}
              >
                {/* Message Body */}
                <div className="whitespace-pre-line font-normal">{msg.content}</div>

                {/* Sources & Citations (Section 4E spec requirement) */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Verified Citations & Guidelines:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-tealAccent-700 hover:text-tealAccent-800 font-semibold"
                        >
                          <CheckCircle2 className="w-3 h-3 text-tealAccent-600" />
                          {src.title}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer Pill */}
                {msg.disclaimer && (
                  <div className="mt-2 text-[10px] text-slate-400 italic">
                    ℹ️ {msg.disclaimer}
                  </div>
                )}

                <div
                  className={`text-[9px] mt-2 text-right ${
                    msg.role === 'user' ? 'text-tealAccent-200' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-tealAccent-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-slate-500">
              <div className="w-8 h-8 rounded-xl bg-botanical-900 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-tealAccent-400 animate-spin" />
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tealAccent-600 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-tealAccent-600 animate-bounce delay-100" />
                <span className="w-1.5 h-1.5 rounded-full bg-tealAccent-600 animate-bounce delay-200" />
                <span className="text-[11px] text-slate-500">Consulting verified disposal guidance...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        {activeSuggestions.length > 0 && (
          <div className="px-6 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-slate-400 font-semibold shrink-0">Suggested:</span>
            {activeSuggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(sug)}
                className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-tealAccent-500 hover:text-botanical-900 whitespace-nowrap transition-colors"
              >
                {sug}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask a question about blister packs, expired medicines, bottles, or recycling..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:border-tealAccent-600 resize-none max-h-24"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="px-5 rounded-xl bg-botanical-900 text-white font-bold hover:bg-botanical-800 transition-colors flex items-center justify-center shadow-2xs disabled:opacity-40"
            >
              <Send className="w-4 h-4 text-tealAccent-400" />
            </button>
          </form>

          {/* Clinical Safety Constraint Notice */}
          <div className="mt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
            <AlertOctagon className="w-3 h-3 text-amber-500" />
            <span>
              <strong>Clinical Guardrail:</strong> PharmaCycle AI assists exclusively with waste disposal. We do not provide clinical drug advice or diagnosis.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
