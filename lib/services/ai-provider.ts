/**
 * AI Provider Manager
 *
 * Manages LLM provider selection via Vercel AI SDK.
 * Supports Anthropic (Claude), OpenAI, and Ollama.
 */

import type { LanguageModel } from 'ai'
import { loadSettings } from './settings-persistence'

export async function getModel(): Promise<LanguageModel | null> {
  const settings = await loadSettings()

  if (!settings.aiProvider) return null

  switch (settings.aiProvider) {
    case 'anthropic': {
      if (!settings.aiApiKey) return null
      const { createAnthropic } = await import('@ai-sdk/anthropic')
      const provider = createAnthropic({ apiKey: settings.aiApiKey })
      return provider(settings.aiModel ?? 'claude-sonnet-4-20250514')
    }
    case 'openai': {
      if (!settings.aiApiKey) return null
      const { createOpenAI } = await import('@ai-sdk/openai')
      const provider = createOpenAI({ apiKey: settings.aiApiKey })
      return provider(settings.aiModel ?? 'gpt-4o')
    }
    case 'ollama': {
      const { createOllama } = await import('ollama-ai-provider-v2')
      const provider = createOllama({
        baseURL: settings.ollamaBaseUrl ?? 'http://localhost:11434/api',
      })
      return provider(settings.aiModel ?? 'llama3.2')
    }
    default:
      return null
  }
}
