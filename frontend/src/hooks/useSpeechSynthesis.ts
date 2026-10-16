import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  activeMessageId: string | null;
  voiceRepliesEnabled: boolean;
  setVoiceRepliesEnabled: (enabled: boolean) => void;
  toggleVoiceReplies: () => void;
  speak: (text: string, messageId?: string, lang?: string) => void;
  stop: () => void;
}

/**
 * Pre-process assistant text for speech synthesis:
 * - Strip markdown characters (*, #, _, `, ~, etc.)
 * - Strip raw URLs completely (never speak out URL links)
 * - Strip citation markers like [1], (WHO), etc.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  return (
    text
      // Strip URLs (http://..., https://..., www....)
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/www\.\S+/gi, '')
      // Strip markdown code blocks & inline code
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Strip markdown bold, italic, strikethrough, headers
      .replace(/[*#_~]/g, '')
      // Strip markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Clean duplicate whitespace and newlines
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState<boolean>(false);

  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window;

  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (!isSupported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
    setIsSpeaking(false);
    setActiveMessageId(null);
    currentUtteranceRef.current = null;
  }, [isSupported]);

  const toggleVoiceReplies = useCallback(() => {
    setVoiceRepliesEnabled((prev) => !prev);
  }, []);

  const speak = useCallback(
    (rawText: string, messageId?: string, lang: string = 'en-IN') => {
      if (!isSupported) {
        // Skip silently if unsupported as per specification
        return;
      }

      // Stop any current utterance
      stop();

      const cleaned = cleanTextForSpeech(rawText);
      if (!cleaned) return;

      try {
        const utterance = new SpeechSynthesisUtterance(cleaned);
        currentUtteranceRef.current = utterance;

        utterance.lang = lang;

        // Try to select an appropriate voice matching the target language
        const voices = window.speechSynthesis.getVoices?.() || [];
        if (voices.length > 0) {
          // Exact language match (e.g. en-IN, hi-IN, kn-IN)
          const matchedVoice =
            voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ||
            voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase())) ||
            voices.find((v) => v.lang.toLowerCase().startsWith('en'));

          if (matchedVoice) {
            utterance.voice = matchedVoice;
          }
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          setActiveMessageId(messageId || null);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setActiveMessageId(null);
          currentUtteranceRef.current = null;
        };

        utterance.onerror = (e) => {
          // "interrupted" or "canceled" happens on user stop; ignore
          if (e.error !== 'interrupted' && e.error !== 'canceled') {
            console.warn('Speech synthesis error:', e.error);
          }
          setIsSpeaking(false);
          setActiveMessageId(null);
          currentUtteranceRef.current = null;
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis failed to execute:', err);
        setIsSpeaking(false);
        setActiveMessageId(null);
      }
    },
    [isSupported, stop]
  );

  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      if (isSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }
    };
  }, [isSupported]);

  return {
    isSupported,
    isSpeaking,
    activeMessageId,
    voiceRepliesEnabled,
    setVoiceRepliesEnabled,
    toggleVoiceReplies,
    speak,
    stop
  };
}
