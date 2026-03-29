import { create } from 'zustand'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AdvisorAlert {
  id: string
  severity: 'briefing' | 'warning' | 'alert'
  title: string
  content: string
  timestamp: number
}

interface AdvisorState {
  conversation: ChatMessage[]
  alerts: AdvisorAlert[]
  isStreaming: boolean

  addUserMessage: (content: string) => void
  addAssistantMessage: (content: string) => void
  setConversation: (messages: ChatMessage[]) => void
  clearConversation: () => void
  addAlert: (alert: AdvisorAlert) => void
  setAlerts: (alerts: AdvisorAlert[]) => void
  clearAlerts: () => void
  setStreaming: (streaming: boolean) => void
}

export const useAdvisorStore = create<AdvisorState>((set) => ({
  conversation: [],
  alerts: [],
  isStreaming: false,

  addUserMessage: (content) =>
    set((state) => ({
      conversation: [...state.conversation, { role: 'user', content }],
    })),
  addAssistantMessage: (content) =>
    set((state) => ({
      conversation: [...state.conversation, { role: 'assistant', content }],
    })),
  setConversation: (messages) => set({ conversation: messages }),
  clearConversation: () => set({ conversation: [] }),
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  setAlerts: (alerts) => set({ alerts }),
  clearAlerts: () => set({ alerts: [] }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
}))
