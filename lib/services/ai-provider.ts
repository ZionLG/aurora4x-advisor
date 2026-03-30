/**
 * AI Provider Manager
 *
 * Manages LLM provider selection via Vercel AI SDK.
 * Supports Anthropic (Claude), OpenAI, and Ollama.
 */

import type { LanguageModel } from 'ai'
import { generateText } from 'ai'
import { loadSettings } from './settings-persistence'

export interface AiStatus {
  configured: boolean
  provider: string | null
  model: string | null
  connected: boolean
  error: string | null
}

/**
 * Test if the current AI provider is actually reachable.
 */
export async function verifyConnection(): Promise<AiStatus> {
  const settings = await loadSettings()

  if (!settings.aiProvider) {
    return { configured: false, provider: null, model: null, connected: false, error: null }
  }

  const providerName = settings.aiProvider
  const modelName =
    settings.aiModel ??
    (providerName === 'anthropic' ? 'claude-sonnet-4-20250514' : providerName === 'openai' ? 'gpt-4o' : 'llama3.2')

  // Check basic config
  if ((providerName === 'anthropic' || providerName === 'openai') && !settings.aiApiKey) {
    return {
      configured: true,
      provider: providerName,
      model: modelName,
      connected: false,
      error: 'No API key configured',
    }
  }

  try {
    const model = await getModel()
    if (!model) {
      return {
        configured: true,
        provider: providerName,
        model: modelName,
        connected: false,
        error: 'Failed to create model',
      }
    }

    // Send a minimal test request
    await generateText({
      model,
      prompt: 'Reply with OK',
      maxOutputTokens: 5,
    })

    return { configured: true, provider: providerName, model: modelName, connected: true, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { configured: true, provider: providerName, model: modelName, connected: false, error: message }
  }
}

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
