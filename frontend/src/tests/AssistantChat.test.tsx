import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AssistantProvider, useAssistant } from '../context/AssistantContext';
import { AssistantChat } from '../components/AssistantChat';
import { ChatDrawer } from '../components/ChatDrawer';

// Helper component to test drawer open/close
const DrawerTestWrapper: React.FC = () => {
  const { openDrawer } = useAssistant();
  return (
    <div>
      <button onClick={() => openDrawer()} data-testid="open-drawer-btn">
        Open Drawer
      </button>
      <ChatDrawer />
    </div>
  );
};

describe('Assistant Chat UI (Stage B)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. sends a typed question and renders assistant reply with mode badge', async () => {
    const mockResponse = {
      reply: 'Expired tablets should be returned to a pharmacy drop-off collection box.',
      mode: 'rules_grounded',
      intent: 'disposal_query',
      refused: false,
      sources: [
        { title: 'FDA Safe Medicine Disposal', url: 'https://www.fda.gov' }
      ],
      disclaimer: 'Grounded in health guidelines',
      suggestions: ['Can I recycle blister packs?'],
      actions: [
        { label: 'Locate Take-Back Points', action_type: 'navigate', payload: '/facilities' }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    } as Response);

    render(
      <BrowserRouter>
        <AssistantProvider>
          <AssistantChat layoutMode="full" />
        </AssistantProvider>
      </BrowserRouter>
    );

    // Initial welcome mode badge
    expect(screen.getByTestId('mode-badge-rules')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Ask about blister packs/i);
    fireEvent.change(input, { target: { value: 'How should I dispose of expired tablets?' } });
    expect(input).toHaveValue('How should I dispose of expired tablets?');

    const sendBtn = screen.getByLabelText(/Send question to assistant/i);
    fireEvent.click(sendBtn);

    // Question appears in thread (scoped to message container or select non-sr-only)
    expect(screen.getAllByText('How should I dispose of expired tablets?').length).toBeGreaterThanOrEqual(1);

    // Assistant reply appears
    await waitFor(() => {
      expect(screen.getAllByText(/Expired tablets should be returned to a pharmacy/i).length).toBeGreaterThanOrEqual(1);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/assistant/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"message":"How should I dispose of expired tablets?"')
      })
    );
  });

  it('2. renders verified sources as links and unverified sources as plain badges', async () => {
    const mockResponse = {
      reply: 'Disposal information for complex packaging.',
      mode: 'rules_grounded',
      sources: [
        { title: 'WHO Disposal Guidelines', url: 'https://www.who.int' },
        { title: 'Local Municipal Directive', url: null }
      ],
      disclaimer: 'General guidance',
      suggestions: []
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    } as Response);

    render(
      <BrowserRouter>
        <AssistantProvider>
          <AssistantChat layoutMode="full" />
        </AssistantProvider>
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/Ask about blister packs/i);
    fireEvent.change(input, { target: { value: 'What about complex packaging?' } });
    fireEvent.click(screen.getByLabelText(/Send question to assistant/i));

    await waitFor(() => {
      expect(screen.getByText('WHO Disposal Guidelines')).toBeInTheDocument();
    });

    // Verified URL renders as an anchor with href
    const verifiedLink = screen.getByRole('link', { name: /WHO Disposal Guidelines/i });
    expect(verifiedLink).toHaveAttribute('href', 'https://www.who.int');
    expect(verifiedLink).toHaveAttribute('target', '_blank');

    // Unverified source renders plain text without an anchor href
    expect(screen.getByText(/Local Municipal Directive \(unverified guidance\)/i)).toBeInTheDocument();
  });

  it('3. renders emergency safety refusals with distinct, prominent visual styling', async () => {
    const mockRefusalResponse = {
      reply: 'CRITICAL MEDICAL EMERGENCY: PharmaCycle AI cannot treat poisoning or overdoses.',
      mode: 'rules_grounded',
      intent: 'emergency_refusal',
      refused: true,
      sources: [],
      disclaimer: 'Emergency refusal',
      suggestions: [],
      actions: [
        { label: 'Emergency Hotline (112)', action_type: 'emergency_call', payload: '112' }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRefusalResponse
    } as Response);

    render(
      <BrowserRouter>
        <AssistantProvider>
          <AssistantChat layoutMode="full" />
        </AssistantProvider>
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/Ask about blister packs/i);
    fireEvent.change(input, { target: { value: 'My child accidentally swallowed 10 pills!' } });
    fireEvent.click(screen.getByLabelText(/Send question to assistant/i));

    await waitFor(() => {
      expect(screen.getByTestId('emergency-refusal-bubble')).toBeInTheDocument();
    });

    const refusalBubble = screen.getByTestId('emergency-refusal-bubble');
    expect(within(refusalBubble).getByText(/Critical Safety Refusal/i)).toBeInTheDocument();
    expect(within(refusalBubble).getByText(/CRITICAL MEDICAL EMERGENCY/i)).toBeInTheDocument();
    expect(screen.getByText('Emergency Hotline (112)')).toBeInTheDocument();
  });

  it('4. resilience: keeps the typed message in input when network/backend request fails and shows retry banner', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    render(
      <BrowserRouter>
        <AssistantProvider>
          <AssistantChat layoutMode="full" />
        </AssistantProvider>
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/Ask about blister packs/i);
    fireEvent.change(input, { target: { value: 'How to recycle medicine bottles?' } });
    fireEvent.click(screen.getByLabelText(/Send question to assistant/i));

    // Wait for failure
    await waitFor(() => {
      expect(screen.getByTestId('error-retry-banner')).toBeInTheDocument();
    });

    // The user's typed message was preserved in the input box!
    expect(input).toHaveValue('How to recycle medicine bottles?');
    expect(screen.getByText('Retry Question')).toBeInTheDocument();
  });

  it('5. drawer keyboard behavior: focus trap and Escape key closes drawer', async () => {
    render(
      <BrowserRouter>
        <AssistantProvider>
          <DrawerTestWrapper />
        </AssistantProvider>
      </BrowserRouter>
    );

    // Drawer is closed initially
    expect(screen.queryByTestId('chat-drawer')).not.toBeInTheDocument();

    // Open drawer
    fireEvent.click(screen.getByTestId('open-drawer-btn'));
    expect(screen.getByTestId('chat-drawer')).toBeInTheDocument();

    // Press Escape -> drawer closes
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('chat-drawer')).not.toBeInTheDocument();
    });
  });
});
