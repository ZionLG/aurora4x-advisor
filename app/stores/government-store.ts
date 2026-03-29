import { create } from 'zustand'
import type { Briefing } from '@/shared/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface GovernmentState {
  // Per-ministry conversations keyed by ministryId
  conversations: Record<string, ChatMessage[]>
  briefings: Briefing[]
  isStreaming: boolean

  addUserMessage: (ministryId: string, content: string) => void
  addAssistantMessage: (ministryId: string, content: string) => void
  clearConversation: (ministryId: string) => void
  addBriefing: (briefing: Briefing) => void
  setBriefings: (briefings: Briefing[]) => void
  clearBriefings: () => void
  setStreaming: (streaming: boolean) => void
}

export const useGovernmentStore = create<GovernmentState>((set) => ({
  conversations: {},
  briefings: [],
  isStreaming: false,

  addUserMessage: (ministryId, content) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [ministryId]: [...(state.conversations[ministryId] ?? []), { role: 'user' as const, content }],
      },
    })),
  addAssistantMessage: (ministryId, content) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [ministryId]: [...(state.conversations[ministryId] ?? []), { role: 'assistant' as const, content }],
      },
    })),
  clearConversation: (ministryId) =>
    set((state) => ({
      conversations: { ...state.conversations, [ministryId]: [] },
    })),
  addBriefing: (briefing) => set((state) => ({ briefings: [briefing, ...state.briefings] })),
  setBriefings: (briefings) => set({ briefings }),
  clearBriefings: () => set({ briefings: [] }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
}))
