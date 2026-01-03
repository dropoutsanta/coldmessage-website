'use client';

import { useState, useCallback, useRef, useSyncExternalStore } from 'react';

export interface StreamingAgent {
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  duration?: number;
  result?: string;
  output?: unknown;
  details?: string[];
  /** Full accumulated text as it streams in (for real-time display) */
  streamingText: string;
  tokenCount: number;
}

export interface StreamingState {
  isStreaming: boolean;
  progress: number;
  currentAgent: string;
  agents: StreamingAgent[];
  error: string | null;
  slug: string | null;
  campaign: unknown | null;
  pipelineId: string | null;
}

const AGENT_ORDER = [
  'Website Scraper',
  'Company Profiler', 
  'ICP Brainstormer',
  'Cold Email Ranker',
  'LinkedIn Filter Builder',
  'Lead Finder',
  'Email Writer',
];

const initialAgents = (): StreamingAgent[] => 
  AGENT_ORDER.map(name => ({ 
    name, 
    status: 'pending', 
    streamingText: '',
    tokenCount: 0,
  }));

// Store pre-parsed fields from server - NO client-side parsing needed!
export interface StreamingFieldData {
  fields: Record<string, unknown>;
  fieldCount: number;
  tokenCount: number;
}

// Singleton store for streaming fields - updates don't trigger React re-renders
// Components subscribe to this via useSyncExternalStore for RAF-throttled updates
class StreamingFieldsStore {
  private data: Map<string, StreamingFieldData> = new Map();
  private listeners: Set<() => void> = new Set();
  private rafId: number | null = null;
  private dirty = false;

  update(agentName: string, fields: Record<string, unknown>, fieldCount: number, tokenCount: number) {
    this.data.set(agentName, { fields, fieldCount, tokenCount });
    this.dirty = true;
    
    // Throttle notifications to RAF (60fps max)
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        if (this.dirty) {
          this.dirty = false;
          this.listeners.forEach(listener => listener());
        }
      });
    }
  }

  get(agentName: string): StreamingFieldData | undefined {
    return this.data.get(agentName);
  }

  clear() {
    this.data.clear();
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return this.data;
  }
}

// Singleton instance
const streamingFieldsStore = new StreamingFieldsStore();

// Hook to subscribe to pre-parsed streaming fields for a specific agent
// NO CLIENT-SIDE PARSING - fields come pre-parsed from server!
export function useStreamingFields(agentName: string): StreamingFieldData {
  const data = useSyncExternalStore(
    (callback) => streamingFieldsStore.subscribe(callback),
    () => streamingFieldsStore.get(agentName),
    () => streamingFieldsStore.get(agentName)
  );
  return data || { fields: {}, fieldCount: 0, tokenCount: 0 };
}

export function useStreamingCampaign() {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    progress: 0,
    currentAgent: '',
    agents: initialAgents(),
    error: null,
    slug: null,
    campaign: null,
    pipelineId: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startGeneration = useCallback(async (
    domain: string, 
    campaignId?: string,
    existingSlug?: string
  ) => {
    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Clear the streaming fields store
    streamingFieldsStore.clear();

    // Reset state
    setState({
      isStreaming: true,
      progress: 0,
      currentAgent: '',
      agents: initialAgents(),
      error: null,
      slug: existingSlug || null,
      campaign: null,
      pipelineId: null,
    });

    try {
      const response = await fetch('/api/generate-campaign/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, campaignId, slug: existingSlug }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
          } else if (line === '' && currentEvent && currentData) {
            // End of event, process it
            try {
              const data = JSON.parse(currentData);
              handleSSEEvent(currentEvent, data, setState);
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[Stream] Aborted');
        return;
      }
      
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  return {
    ...state,
    startGeneration,
    stopGeneration,
  };
}

function handleSSEEvent(
  event: string, 
  data: Record<string, unknown>,
  setState: React.Dispatch<React.SetStateAction<StreamingState>>
) {
  switch (event) {
    case 'start':
      setState(prev => ({
        ...prev,
        pipelineId: data.pipelineId as string,
        slug: data.slug as string,
      }));
      break;

    case 'agent_start':
      setState(prev => ({
        ...prev,
        currentAgent: data.agent as string,
        progress: data.progress as number,
        agents: prev.agents.map(agent => 
          agent.name === data.agent 
            ? { ...agent, status: 'running' as const, streamingText: '', tokenCount: 0 }
            : agent
        ),
      }));
      break;

    case 'agent_token':
      // Update the external store with PRE-PARSED fields from server
      // NO client-side parsing needed!
      streamingFieldsStore.update(
        data.agent as string,
        (data.fields || {}) as Record<string, unknown>,
        (data.fieldCount || 0) as number,
        data.tokenCount as number
      );
      break;

    case 'agent_complete':
      setState(prev => ({
        ...prev,
        progress: data.progress as number,
        agents: prev.agents.map(agent => 
          agent.name === data.agent 
            ? { 
                ...agent, 
                status: 'complete' as const, 
                duration: data.duration as number,
                result: data.result as string,
                output: data.output,
                details: data.details as string[] | undefined,
              }
            : agent
        ),
      }));
      break;

    case 'complete':
      setState(prev => ({
        ...prev,
        isStreaming: false,
        progress: 100,
        currentAgent: '',
        campaign: data.campaign,
        slug: data.slug as string,
      }));
      break;

    case 'error':
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: data.message as string,
      }));
      break;
  }
}
