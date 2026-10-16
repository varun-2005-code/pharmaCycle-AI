import { useState, useRef, useEffect, useCallback } from 'react';

export type VoiceLanguage = 'en-IN' | 'hi-IN' | 'kn-IN';

export interface UseSpeechRecognitionOptions {
  onInterimTranscript?: (interimText: string, accumulatedFinal: string) => void;
  onFinalTranscript?: (finalText: string) => void;
  onError?: (errorMessage: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  language: VoiceLanguage;
  setLanguage: (lang: VoiceLanguage) => void;
  startListening: () => void;
  stopListening: () => void;
  abortListening: () => void;
  resetTranscript: () => void;
  clearError: () => void;
}

// Map Web Speech API error codes to clear, actionable user messages
export function mapSpeechError(errorCode: string): string {
  switch (errorCode) {
    case 'not-allowed':
    case 'permission-denied':
      return 'Microphone access was denied. Please allow microphone permissions in your browser settings to use voice input.';
    case 'no-speech':
      return 'No speech was detected. Please try speaking again.';
    case 'audio-capture':
      return 'No microphone was found or microphone is not working.';
    case 'network':
      return 'Network error occurred during speech recognition.';
    case 'aborted':
      return 'Voice recognition was stopped.';
    default:
      return `Speech recognition error: ${errorCode}`;
  }
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const { onInterimTranscript, onFinalTranscript, onError } = options;

  const [language, setLanguage] = useState<VoiceLanguage>('en-IN');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Check Web Speech API support
  const isSupported = typeof window !== 'undefined' && Boolean(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );

  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef<boolean>(false);

  // Keep latest callbacks in ref to avoid stale closures
  const callbacksRef = useRef(options);
  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
    }
    setIsListening(false);
  }, []);

  const abortListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore if already aborted
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      const unsupportedMsg = "Voice input isn't supported in this browser; please type.";
      setError(unsupportedMsg);
      callbacksRef.current.onError?.(unsupportedMsg);
      return;
    }

    if (isListening && recognitionRef.current) {
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
    }

    setError(null);
    isManuallyStoppedRef.current = false;

    try {
      const windowObj = window as any;
      const SpeechRecognitionClass = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let accumulatedFinal = '';
        let currentInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            accumulatedFinal += text;
          } else {
            currentInterim += text;
          }
        }

        setInterimTranscript(currentInterim);
        if (accumulatedFinal) {
          setTranscript((prev) => {
            const updated = prev ? `${prev} ${accumulatedFinal}` : accumulatedFinal;
            callbacksRef.current.onFinalTranscript?.(updated);
            return updated;
          });
        }

        callbacksRef.current.onInterimTranscript?.(currentInterim, accumulatedFinal);
      };

      recognition.onerror = (event: any) => {
        // Ignore error if recognition was manually stopped or aborted
        if (isManuallyStoppedRef.current && (event.error === 'aborted' || event.error === 'no-speech')) {
          return;
        }

        const friendlyMsg = mapSpeechError(event.error);
        setError(friendlyMsg);
        setIsListening(false);
        callbacksRef.current.onError?.(friendlyMsg);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      const friendlyMsg = err?.message || 'Failed to start speech recognition.';
      setError(friendlyMsg);
      setIsListening(false);
      callbacksRef.current.onError?.(friendlyMsg);
    }
  }, [isSupported, isListening, language]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      isManuallyStoppedRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    language,
    setLanguage,
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
    clearError
  };
}
