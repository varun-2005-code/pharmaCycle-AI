import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AssistantProvider, useAssistant } from '../context/AssistantContext';
import { AssistantChat } from '../components/AssistantChat';
import { ChatDrawer } from '../components/ChatDrawer';

// Mock Web Speech Recognition class
class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = 'en-IN';
  onstart: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;

  start = vi.fn(() => {
    MockSpeechRecognition.instances.push(this);
    if (this.onstart) this.onstart();
  });

  stop = vi.fn(() => {
    if (this.onend) this.onend();
  });

  abort = vi.fn(() => {
    if (this.onend) this.onend();
  });

  // Test helpers to simulate speech events
  simulateSpeechResult(transcript: string, isFinal: boolean) {
    if (this.onresult) {
      this.onresult({
        results: [
          Object.assign([{ transcript }], { isFinal })
        ]
      });
    }
  }

  simulateError(error: string) {
    if (this.onerror) {
      this.onerror({ error });
    }
  }
}

// Mock SpeechSynthesis
const mockSpeechSynthesis = {
  speak: vi.fn((utterance: any) => {
    if (utterance.onstart) utterance.onstart();
  }),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => [
    { lang: 'en-IN', name: 'Google English (India)' },
    { lang: 'hi-IN', name: 'Google Hindi' },
    { lang: 'kn-IN', name: 'Google Kannada' }
  ])
};

class MockSpeechSynthesisUtterance {
  text: string;
  lang = 'en-IN';
  voice: any = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const DrawerTestWrapper: React.FC = () => {
  const { openDrawer, closeDrawer } = useAssistant();
  return (
    <div>
      <button onClick={() => openDrawer()} data-testid="open-drawer-btn">
        Open Drawer
      </button>
      <button onClick={() => closeDrawer()} data-testid="close-drawer-btn">
        Close Drawer
      </button>
      <ChatDrawer />
    </div>
  );
};

describe('Assistant Voice Input & Text-to-Speech (Stage C)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    MockSpeechRecognition.instances = [];

    // Install mocks on window
    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    (window as any).speechSynthesis = mockSpeechSynthesis;
    (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    delete (window as any).speechSynthesis;
    delete (window as any).SpeechSynthesisUtterance;
  });

  it('1. unsupported browser: hides mic button and displays unsupported message', () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    render(
      <BrowserRouter>
        <AssistantProvider>
          <AssistantChat layoutMode="full" />
        </AssistantProvider>
      </BrowserRouter>
    );

    expect(screen.queryByTestId('voice-input-button')).not.toBeInTheDocument();
    expect(
      screen.getByText("Voice input isn't supported in this browser; please type.")
    ).toBeInTheDocument();
  });

  it('2. first use: displays one-time privacy notice before starting mic', () => {
    render(
      <BrowserRouter>
        <AssistantProvider>
          <AssistantChat layoutMode="full" />
        </AssistantProvider>
      </BrowserRouter>
    );

    const micBtn = screen.getByTestId('voice-input-button');
    expect(micBtn).toHaveAttribute('aria-pressed', 'false');

    // Click mic button for the first time
    fireEvent.click(micBtn);

    // One-time privacy notice appears
    expect(screen.getByTestId('speech-privacy-notice')).toBeInTheDocument();
    expect(
      screen.getByText(
        "Voice recognition is provided by your browser and may send audio to your browser vendor's speech service."
      )
    ).toBeInTheDocument();

    // User accepts notice
    const acceptBtn = screen.getByTestId('accept-privacy-notice-btn');
    fireEvent.click(acceptBtn);

    expect(screen.queryByTestId('speech-privacy-notice')).not.toBeInTheDocument();
    expect(localStorage.getItem('pharmacycle_voice_privacy_acknowledged')).toBe('true');
    expect(screen.getByTestId('listening-status-indicator')).toBeInTheDocument();
    expect(micBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('3. live interim and final transcript updates in input box without auto-sending', async () => {
    // Acknowledge privacy notice in advance
    localStorage.setItem('pharmacycle_voice_privacy_acknowledged', 'true');

    render(
      <BrowserRouter>
        <AssistantProvider>
          <AssistantChat layoutMode="full" />
        </AssistantProvider>
      </BrowserRouter>
    );

    const micBtn = screen.getByTestId('voice-input-button');
    fireEvent.click(micBtn);

    const recognitionInstance = MockSpeechRecognition.instances[0];
    expect(recognitionInstance).toBeDefined();

    // Simulate interim results
    act(() => {
      recognitionInstance.simulateSpeechResult('how to recycle blister', false);
    });

    const input = screen.getByPlaceholderText(/Ask about blister packs/i);
    expect(input).toHaveValue('how to recycle blister');

    // Simulate final result
    act(() => {
      recognitionInstance.simulateSpeechResult('how to recycle blister packs safely', true);
    });

    expect(input).toHaveValue('how to recycle blister packs safely');

    // Final transcript must remain EDITABLE and must NOT be sent automatically
    fireEvent.change(input, {
      target: { value: 'how to recycle blister packs safely in Bangalore' }
    });
    expect(input).toHaveValue('how to recycle blister packs safely in Bangalore');

    // User explicitly presses Send
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: 'Blister packs require specialized recycling points.',
        mode: 'rules_grounded',
        sources: []
      })
    } as Response);

    const sendBtn = screen.getByLabelText(/Send question to assistant/i);
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Blister packs require specialized recycling points/i).length).toBeGreaterThanOrEqual(1);
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/assistant/chat',
      expect.objectContaining({
        body: expect.stringContaining('how to recycle blister packs safely in Bangalore')
      })
    );
  });

  it('4. permission denied error handling with clear user feedback', () => {
    localStorage.setItem('pharmacycle_voice_privacy_acknowledged', 'true');

    render(
      <BrowserRouter>
        <AssistantProvider>
          <AssistantChat layoutMode="full" />
        </AssistantProvider>
      </BrowserRouter>
    );

    const micBtn = screen.getByTestId('voice-input-button');
    fireEvent.click(micBtn);

    const recognitionInstance = MockSpeechRecognition.instances[0];
    act(() => {
      recognitionInstance.simulateError('not-allowed');
    });

    expect(screen.getByTestId('speech-error-banner')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Microphone access was denied. Please allow microphone permissions in your browser settings to use voice input.'
      )
    ).toBeInTheDocument();
  });

  it('5. language selector switches recognition language and displays English answer note', () => {
    render(
      <BrowserRouter>
        <AssistantProvider>
          <AssistantChat layoutMode="full" />
        </AssistantProvider>
      </BrowserRouter>
    );

    const langSelect = screen.getByLabelText('Select speech language');
    expect(langSelect).toHaveValue('en-IN');
    expect(screen.getByText('(Answers are in English)')).toBeInTheDocument();

    fireEvent.change(langSelect, { target: { value: 'hi-IN' } });
    expect(langSelect).toHaveValue('hi-IN');

    fireEvent.change(langSelect, { target: { value: 'kn-IN' } });
    expect(langSelect).toHaveValue('kn-IN');
  });

  it('6. cleanup: aborts speech recognition when drawer is closed or unmounted', () => {
    localStorage.setItem('pharmacycle_voice_privacy_acknowledged', 'true');

    render(
      <BrowserRouter>
        <AssistantProvider>
          <DrawerTestWrapper />
        </AssistantProvider>
      </BrowserRouter>
    );

    // Open drawer
    fireEvent.click(screen.getByTestId('open-drawer-btn'));

    const micBtn = screen.getByTestId('voice-input-button');
    fireEvent.click(micBtn);

    const recognitionInstance = MockSpeechRecognition.instances[0];
    expect(recognitionInstance).toBeDefined();

    // Close drawer -> component unmounts and cleanup triggers abort()
    fireEvent.click(screen.getByTestId('close-drawer-btn'));

    expect(recognitionInstance.abort).toHaveBeenCalled();
  });

  it('7. text-to-speech: read aloud button speaks assistant answer without URLs and stop halts speech', async () => {
    render(
      <BrowserRouter>
        <AssistantProvider>
          <AssistantChat layoutMode="full" />
        </AssistantProvider>
      </BrowserRouter>
    );

    // Read aloud button exists on welcome message
    const readAloudBtn = screen.getByTestId('read-aloud-btn-welcome');
    expect(readAloudBtn).toBeInTheDocument();

    fireEvent.click(readAloudBtn);

    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    const spokenUtterance = mockSpeechSynthesis.speak.mock.calls[0][0];

    // Source URLs must NOT be spoken out
    expect(spokenUtterance.text).not.toContain('https://');
    expect(spokenUtterance.text).not.toContain('www.');

    // Stop speaking button halts speech
    expect(screen.getByTestId('stop-speaking-button')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('stop-speaking-button'));
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
  });

  it('8. global voice replies toggle can be turned ON/OFF', () => {
    render(
      <BrowserRouter>
        <AssistantProvider>
          <AssistantChat layoutMode="full" />
        </AssistantProvider>
      </BrowserRouter>
    );

    const voiceRepliesToggle = screen.getByTestId('toggle-voice-replies');
    expect(voiceRepliesToggle).toHaveTextContent('Voice replies: OFF');
    expect(voiceRepliesToggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(voiceRepliesToggle);
    expect(voiceRepliesToggle).toHaveTextContent('Voice replies: ON');
    expect(voiceRepliesToggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(voiceRepliesToggle);
    expect(voiceRepliesToggle).toHaveTextContent('Voice replies: OFF');
    expect(voiceRepliesToggle).toHaveAttribute('aria-pressed', 'false');
  });
});
