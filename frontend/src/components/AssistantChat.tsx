import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  AlertOctagon,
  User,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  PhoneCall,
  Sparkle,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import type { ChatMessage, ChatResponse, SuggestedAction, ChatContext } from '../types';
import { useAssistant } from '../context/AssistantContext';
import { useSpeechRecognition, VoiceLanguage } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

const SPEC_EXAMPLE_QUESTIONS = [
  'How should I dispose of expired tablets?',
  'Can I put an empty blister pack in a plastic recycling bin?',
  'How do I read the expiry date on this medicine?',
  'What should I do if the expiry date is unreadable?'
];

interface AssistantChatProps {
  layoutMode?: 'full' | 'drawer';
  onCloseDrawer?: () => void;
}

export const AssistantChat: React.FC<AssistantChatProps> = ({
  layoutMode = 'full',
  onCloseDrawer
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeContext, clearWasteContext, initialQuery, clearInitialQuery } = useAssistant();

  const [activeMode, setActiveMode] = useState<'rules_grounded' | 'llm_grounded'>('rules_grounded');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your **PharmaCycle AI Disposal Assistant**.\n\nI provide evidence-grounded instructions for safely disposing of medicines and recycling pharmaceutical packaging based exclusively on approved health and environmental standards.\n\nI answer solely from verified disposal regulations and guide content. I do not provide medical diagnoses, evaluate drug consumption safety, or invent facility addresses.',
      mode: 'rules_grounded',
      refused: false,
      sources: [
        { title: 'WHO Safe Medical Waste Guidance', url: 'https://www.who.int' },
        { title: 'FDA Safe Medicine Disposal', url: 'https://www.fda.gov/drugs/safe-disposal-medicines' }
      ],
      disclaimer: 'Grounded exclusively in published health authority guidance. Decoupled from unconstrained LLM hallucinations.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>(SPEC_EXAMPLE_QUESTIONS);
  const [announcement, setAnnouncement] = useState<string>('');
  const [showPrivacyNotice, setShowPrivacyNotice] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const baseInputBeforeSpeechRef = useRef<string>('');

  // Speech Recognition Hook (Web Speech API)
  const {
    isSupported: isSpeechSupported,
    isListening,
    error: speechError,
    language: selectedVoiceLang,
    setLanguage: setSelectedVoiceLang,
    startListening,
    stopListening,
    abortListening,
    clearError: clearSpeechError
  } = useSpeechRecognition({
    onInterimTranscript: (interimText, accumulatedFinal) => {
      // Live transcription into input box; final transcript stays EDITABLE and is NOT sent automatically
      const base = baseInputBeforeSpeechRef.current;
      const speechPart = accumulatedFinal
        ? (interimText ? `${accumulatedFinal} ${interimText}` : accumulatedFinal)
        : interimText;
      const combined = base ? `${base} ${speechPart}` : speechPart;
      setInputMessage(combined);
    },
    onFinalTranscript: (finalText) => {
      const base = baseInputBeforeSpeechRef.current;
      const combined = base ? `${base} ${finalText}` : finalText;
      setInputMessage(combined);
    },
    onError: (errMsg) => {
      setAnnouncement(`Voice recognition error: ${errMsg}`);
    }
  });

  // Speech Synthesis Hook (Web Speech API)
  const {
    isSupported: isTtsSupported,
    isSpeaking,
    activeMessageId: ttsActiveMessageId,
    voiceRepliesEnabled,
    toggleVoiceReplies,
    speak,
    stop: stopSpeaking
  } = useSpeechSynthesis();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, errorMessage]);

  // Clean up voice input and speech synthesis on route change or drawer closing/unmount
  useEffect(() => {
    abortListening();
    stopSpeaking();
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      abortListening();
      stopSpeaking();
    };
  }, []);

  // Handle initialQuery triggered from external CTA (e.g. hero button or context chip)
  useEffect(() => {
    if (initialQuery) {
      handleSendMessage(initialQuery);
      clearInitialQuery();
    }
  }, [initialQuery]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      setAnnouncement('Voice recognition stopped.');
      return;
    }

    // Spec Requirement: Start microphone ONLY after user click.
    // Show a one-time notice on first use. Never record, store or upload audio ourselves.
    const hasAcknowledged = localStorage.getItem('pharmacycle_voice_privacy_acknowledged');
    if (!hasAcknowledged) {
      setShowPrivacyNotice(true);
      setAnnouncement('Voice recognition privacy notice displayed.');
      return;
    }

    baseInputBeforeSpeechRef.current = inputMessage.trim();
    startListening();
    setAnnouncement(`Microphone listening in ${selectedVoiceLang}. Speak your question.`);
  };

  const handleAcceptPrivacyNotice = () => {
    localStorage.setItem('pharmacycle_voice_privacy_acknowledged', 'true');
    setShowPrivacyNotice(false);
    baseInputBeforeSpeechRef.current = inputMessage.trim();
    startListening();
    setAnnouncement(`Microphone listening in ${selectedVoiceLang}. Speak your question.`);
  };

  const handleSendMessage = async (textToSend?: string) => {
    // If recognition is active, stop it before sending
    if (isListening) {
      stopListening();
    }

    const rawText = textToSend !== undefined ? textToSend : inputMessage;
    const text = rawText.trim();
    if (!text || loading) return;

    // Resilience: keep input in case request fails, clear only on success
    const currentInputSnapshot = rawText;
    setErrorMessage(null);
    setLastFailedMessage(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    baseInputBeforeSpeechRef.current = '';
    setLoading(true);
    setAnnouncement(`Question asked: ${text}. Retrieving disposal guidance.`);

    // Cap history sent to the last 6 turns (max 12 messages)
    const historyPayload = messages
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    // Never send image data; only send structured metadata
    const contextPayload: ChatContext | undefined = activeContext
      ? {
          page: window.location.pathname,
          waste_category: activeContext.waste_category,
          analysis_summary: activeContext.analysis_summary,
          expiry_status: activeContext.expiry_status
        }
      : {
          page: window.location.pathname
        };

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          context: contextPayload
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data: ChatResponse = await res.json();
      const currentMode =
        data.mode === 'llm_grounded' ? 'llm_grounded' : 'rules_grounded';
      setActiveMode(currentMode);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        mode: currentMode,
        intent: data.intent,
        refused: data.refused ?? (data.intent?.includes('refusal') || false),
        sources: data.sources,
        disclaimer: data.disclaimer,
        actions: data.actions || [],
        suggestions: data.suggestions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setAnnouncement(`Assistant replied: ${data.reply.slice(0, 80)}...`);

      // Global voice-replies: if enabled, speak assistant response aloud
      if (voiceRepliesEnabled && data.reply) {
        speak(data.reply, assistantMsg.id, selectedVoiceLang);
      }

      if (data.suggestions && data.suggestions.length > 0) {
        setActiveSuggestions(data.suggestions);
      }
    } catch (err: any) {
      // Resilience requirement: KEEP the typed message if the request fails
      setInputMessage(currentInputSnapshot);
      setLastFailedMessage(text);
      setErrorMessage(
        'Unable to reach the assistant service. The backend server may be temporarily offline or starting up.'
      );
      setAnnouncement('Failed to connect to assistant service. Your typed question was preserved.');
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

  const handleClearChat = () => {
    abortListening();
    stopSpeaking();
    clearSpeechError();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          'Conversation cleared. Ask any question about safe pharmaceutical waste disposal, recycling blister packs, unreadable expiry dates, or take-back collection.',
        mode: 'rules_grounded',
        refused: false,
        sources: [],
        disclaimer: 'General disposal guidance only.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setActiveSuggestions(SPEC_EXAMPLE_QUESTIONS);
    setErrorMessage(null);
    setAnnouncement('Chat history cleared.');
  };

  const handleActionClick = (action: SuggestedAction) => {
    if (action.action_type === 'emergency_call') {
      window.location.href = `tel:${action.payload}`;
      return;
    }

    if (action.action_type === 'navigate') {
      if (layoutMode === 'drawer' && onCloseDrawer) {
        onCloseDrawer();
      }
      navigate(action.payload);
      return;
    }

    if (action.action_type === 'link') {
      window.open(action.payload, '_blank', 'noopener,noreferrer');
      return;
    }

    if (action.action_type === 'prompt') {
      handleSendMessage(action.payload);
      return;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-emerald-100 shadow-soft overflow-hidden">
      {/* Live Region for Screen Reader Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Header Bar */}
      <div className="bg-slate-50 px-4 sm:px-6 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2">
          {/* Mode Badge Requirement */}
          {activeMode === 'llm_grounded' ? (
            <span
              data-testid="mode-badge-llm"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Mode: LLM-grounded
            </span>
          ) : (
            <span
              data-testid="mode-badge-rules"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Mode: Rules-backed FAQ
            </span>
          )}
        </div>

        {/* Clear Conversation Button */}
        <button
          type="button"
          onClick={handleClearChat}
          className="text-[11px] text-slate-500 hover:text-botanical-900 flex items-center gap-1 font-medium cursor-pointer transition-colors"
          aria-label="Clear conversation history"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Clear conversation</span>
        </button>
      </div>

      {/* Active Context Banner */}
      {activeContext && (
        <div
          data-testid="context-banner"
          className="bg-emerald-50/90 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-xs text-emerald-950 shrink-0"
        >
          <div className="flex items-center gap-2 truncate">
            <Sparkle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              Active Context: <strong>{activeContext.waste_category}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                handleSendMessage(`How should I safely dispose of this ${activeContext.waste_category}?`);
              }}
              className="px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-semibold text-[11px] cursor-pointer transition-colors shadow-2xs"
            >
              Ask about this result
            </button>
            <button
              type="button"
              onClick={clearWasteContext}
              className="text-slate-400 hover:text-slate-600 text-[10px] cursor-pointer"
              aria-label="Dismiss active context"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Messages Thread */}
      <div
        className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4"
        tabIndex={0}
        role="log"
        aria-label="Chat messages log"
      >
        {messages.map((msg) => {
          const isEmergency = msg.refused || msg.intent === 'emergency_refusal';
          const isUnavailable = msg.content.includes('Information unavailable');
          const isThisSpeaking = isSpeaking && ttsActiveMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 items-start ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs mt-1 ${
                    isEmergency
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-botanical-900 text-white'
                  }`}
                  aria-hidden="true"
                >
                  {isEmergency ? (
                    <AlertOctagon className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-tealAccent-400" />
                  )}
                </div>
              )}

              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                  msg.role === 'user'
                    ? 'bg-botanical-900 text-white rounded-tr-none'
                    : isEmergency
                    ? 'bg-rose-50 border-2 border-rose-400 text-rose-950 rounded-tl-none ring-2 ring-rose-200'
                    : isUnavailable
                    ? 'bg-amber-50/80 border border-amber-200 text-amber-950 rounded-tl-none'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none'
                }`}
                data-testid={isEmergency ? 'emergency-refusal-bubble' : undefined}
              >
                {/* Assistant Message Header / Refusal Badge / Read Aloud */}
                {msg.role === 'assistant' && (
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isEmergency ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold tracking-wide uppercase bg-rose-600 text-white inline-flex items-center gap-1 shadow-2xs">
                          <AlertOctagon className="w-3 h-3 text-white" />
                          Critical Safety Refusal
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold tracking-tight inline-flex items-center gap-1 ${
                            msg.mode === 'llm_grounded'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          {msg.mode === 'llm_grounded' ? (
                            <>
                              <Sparkles className="w-2.5 h-2.5 text-amber-700" /> LLM-grounded
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" /> Rules-backed FAQ
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Read Aloud Button per Assistant Answer */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isThisSpeaking) {
                          stopSpeaking();
                          setAnnouncement('Speech playback stopped.');
                        } else {
                          speak(msg.content, msg.id, selectedVoiceLang);
                          setAnnouncement('Reading assistant reply aloud.');
                        }
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                        isThisSpeaking
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs'
                      }`}
                      aria-label={
                        isThisSpeaking ? 'Stop reading answer aloud' : 'Read answer aloud'
                      }
                      data-testid={`read-aloud-btn-${msg.id}`}
                    >
                      {isThisSpeaking ? (
                        <>
                          <VolumeX className="w-3 h-3 text-rose-600" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3 text-slate-500" />
                          <span>Read aloud</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Content */}
                <div className="whitespace-pre-line font-normal">{msg.content}</div>

                {/* Suggested Action Buttons from API (Rendered as buttons; never auto-navigate) */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1.5" data-testid="suggested-actions-container">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Suggested Actions:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.actions.map((act, actIdx) => (
                        <button
                          key={actIdx}
                          type="button"
                          onClick={() => handleActionClick(act)}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs ${
                            act.action_type === 'emergency_call'
                              ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold'
                              : 'bg-white hover:bg-emerald-50 text-botanical-900 border border-slate-300 hover:border-tealAccent-500'
                          }`}
                        >
                          {act.action_type === 'emergency_call' ? (
                            <PhoneCall className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5 text-tealAccent-600" />
                          )}
                          {act.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sources & Citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 space-y-1" data-testid="sources-container">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Sources & Citations:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, idx) => {
                        const hasVerifiedUrl = Boolean(src.url && src.url.startsWith('http'));

                        return hasVerifiedUrl ? (
                          <a
                            key={idx}
                            href={src.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-tealAccent-700 hover:text-tealAccent-800 font-semibold shadow-2xs transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3 text-tealAccent-600" />
                            <span>{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        ) : (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-medium"
                          >
                            <HelpCircle className="w-3 h-3 text-slate-400" />
                            <span>{src.title} (unverified guidance)</span>
                          </span>
                        );
                      })}
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
                  className={`text-[9px] mt-1.5 text-right ${
                    msg.role === 'user' ? 'text-tealAccent-200' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.role === 'user' && (
                <div
                  className="w-8 h-8 rounded-xl bg-tealAccent-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1"
                  aria-hidden="true"
                >
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 items-center text-xs text-slate-500" role="status">
            <div className="w-8 h-8 rounded-xl bg-botanical-900 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-tealAccent-400 animate-spin" />
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-tealAccent-600 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-tealAccent-600 animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 rounded-full bg-tealAccent-600 animate-bounce delay-200" />
              <span className="text-[11px] text-slate-600">
                Retrieving verified disposal rules and packaging guidance...
              </span>
            </div>
          </div>
        )}

        {/* Error / Offline Retry Banner */}
        {errorMessage && (
          <div
            data-testid="error-retry-banner"
            className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {lastFailedMessage && (
              <button
                type="button"
                onClick={() => handleSendMessage(lastFailedMessage)}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
              >
                Retry Question
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Chips */}
      {activeSuggestions.length > 0 && (
        <div
          data-testid="suggested-questions-bar"
          className="px-4 sm:px-6 py-2 bg-slate-50/90 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px] shrink-0"
        >
          <span className="text-slate-400 font-semibold shrink-0">Suggestions:</span>
          {activeSuggestions.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(sug)}
              className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-tealAccent-500 hover:text-botanical-900 whitespace-nowrap transition-colors shadow-2xs font-medium cursor-pointer"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Voice Controls Toolbar (Language selection, note, global voice-replies toggle, audio stop) */}
      <div className="bg-slate-50/80 border-t border-slate-100 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="voice-lang-select" className="text-[11px] font-semibold text-slate-600">
              Voice Lang:
            </label>
            <select
              id="voice-lang-select"
              value={selectedVoiceLang}
              onChange={(e) => {
                const newLang = e.target.value as VoiceLanguage;
                setSelectedVoiceLang(newLang);
                setAnnouncement(`Speech recognition language changed to ${newLang}.`);
              }}
              aria-label="Select speech language"
              className="text-[11px] bg-white border border-slate-200 rounded-md px-2 py-0.5 font-medium text-slate-700 focus:outline-hidden focus:border-tealAccent-500 shadow-2xs"
            >
              <option value="en-IN">English (India) [en-IN]</option>
              <option value="hi-IN">Hindi (हिन्दी) [hi-IN]</option>
              <option value="kn-IN">Kannada (ಕನ್ನಡ) [kn-IN]</option>
            </select>
          </div>

          {/* Visible note that answers are in English */}
          <span className="text-[10px] text-slate-500 font-medium">
            (Answers are in English)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Global Voice-replies toggle (OFF by default) */}
          <button
            type="button"
            onClick={() => {
              toggleVoiceReplies();
              setAnnouncement(`Voice replies ${!voiceRepliesEnabled ? 'enabled' : 'disabled'}.`);
            }}
            aria-pressed={voiceRepliesEnabled}
            aria-label="Toggle voice replies automatically reading out answers"
            data-testid="toggle-voice-replies"
            className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md font-medium border transition-colors cursor-pointer shadow-2xs ${
              voiceRepliesEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800'
            }`}
          >
            <Volume2 className={`w-3.5 h-3.5 ${voiceRepliesEnabled ? 'text-emerald-700' : 'text-slate-400'}`} />
            <span>Voice replies: {voiceRepliesEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Stop Audio Button if currently speaking */}
          {isSpeaking && (
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setAnnouncement('Speech playback stopped.');
              }}
              data-testid="stop-speaking-button"
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold animate-pulse shadow-2xs cursor-pointer"
              aria-label="Stop audio playback"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Stop Audio</span>
            </button>
          )}
        </div>
      </div>

      {/* Input Form Bar */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0">
        {/* Active Listening Status Indicator */}
        {isListening && (
          <div
            className="mb-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 shadow-2xs animate-pulse"
            data-testid="listening-status-indicator"
            role="status"
          >
            <div className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
              <span>Listening… Speak now ({selectedVoiceLang}). Interim speech appears in input box.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                stopListening();
                setAnnouncement('Voice recognition stopped.');
              }}
              className="text-xs font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
            >
              Stop
            </button>
          </div>
        )}

        {/* Speech Error Banner */}
        {speechError && (
          <div
            className="mb-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 shadow-2xs"
            data-testid="speech-error-banner"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{speechError}</span>
            </div>
            <button
              type="button"
              onClick={clearSpeechError}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold"
              aria-label="Dismiss speech error"
            >
              ✕
            </button>
          </div>
        )}

        {/* One-time Privacy Notice (Spec requirement) */}
        {showPrivacyNotice && (
          <div
            className="mb-3 p-3.5 rounded-2xl bg-slate-900 text-white text-xs space-y-2 shadow-xl border border-tealAccent-500/40"
            data-testid="speech-privacy-notice"
            role="dialog"
            aria-label="Browser Voice Recognition Notice"
          >
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-tealAccent-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-white text-xs">Browser Voice Recognition Notice</p>
                <p className="text-slate-300 leading-normal text-[11px]">
                  Voice recognition is provided by your browser and may send audio to your browser vendor's speech service.
                </p>
                <p className="text-tealAccent-300 text-[10px]">
                  PharmaCycle AI never records, stores, or uploads audio ourselves, and never sends audio to our backend.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPrivacyNotice(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcceptPrivacyNotice}
                data-testid="accept-privacy-notice-btn"
                className="px-3.5 py-1 rounded-lg bg-tealAccent-500 hover:bg-tealAccent-400 text-botanical-950 font-bold text-xs cursor-pointer shadow-2xs"
              >
                I Understand & Start Mic
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <label htmlFor="assistant-input-box" className="sr-only">
            Type your pharmaceutical disposal question
          </label>
          <textarea
            id="assistant-input-box"
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about blister packs, expired tablets, bottles, or unreadable expiry dates..."
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:border-tealAccent-600 resize-none max-h-24"
            disabled={loading}
          />

          {/* Voice Input Mic Button (Only rendered if supported) */}
          {isSpeechSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={loading}
              aria-label={isListening ? 'Stop voice listening' : 'Start voice input'}
              aria-pressed={isListening}
              data-testid="voice-input-button"
              className={`px-3 sm:px-3.5 rounded-xl border transition-all flex items-center justify-center shadow-2xs cursor-pointer ${
                isListening
                  ? 'bg-rose-50 border-rose-300 text-rose-600 ring-2 ring-rose-200 hover:bg-rose-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-botanical-900 hover:border-tealAccent-500'
              }`}
            >
              {isListening ? (
                <MicOff className="w-4 h-4 text-rose-600 animate-pulse" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="px-4 sm:px-5 rounded-xl bg-botanical-900 text-white font-bold hover:bg-botanical-800 transition-colors flex items-center justify-center shadow-2xs disabled:opacity-40 cursor-pointer"
            aria-label="Send question to assistant"
          >
            <Send className="w-4 h-4 text-tealAccent-400" />
          </button>
        </form>

        {/* Feature Detection: note if voice input is unsupported */}
        {!isSpeechSupported && (
          <div
            className="mt-1.5 text-center text-[11px] text-slate-400 italic"
            data-testid="voice-unsupported-note"
          >
            Voice input isn't supported in this browser; please type.
          </div>
        )}

        {/* Spec Notice Requirement */}
        <div className="mt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>I give general disposal guidance, not medical advice.</span>
        </div>
      </div>
    </div>
  );
};
