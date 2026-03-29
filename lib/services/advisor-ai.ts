/**
 * Advisor AI Service
 *
 * Uses Vercel AI SDK to generate advisor responses.
 * The advisor speaks in character based on archetype + ideology.
 */

import { generateText } from 'ai'
import { getModel } from './ai-provider'
import { getArchetype } from '@/lib/advisor'
import type { ArchetypeId } from '@/shared/types'
import type { GameStateSnapshot, GameEvent } from './game-state-analyzer'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AdvisorAlert {
  id: string
  severity: 'briefing' | 'warning' | 'alert'
  title: string
  content: string
  timestamp: number
}

// In-memory state
let conversation: ChatMessage[] = []
let alerts: AdvisorAlert[] = []

function buildSystemPrompt(
  archetypeId: ArchetypeId,
  ideology: Record<string, number> | null,
  gameState: GameStateSnapshot | null,
): string {
  const archetype = getArchetype(archetypeId)

  let prompt = `You are an advisor to a space-faring civilization in the game Aurora 4X.

## Your Identity
- Archetype: ${archetype.name} — ${archetype.description}
- Tone: ${archetype.toneDescriptors.join(', ')}
- Vocabulary: ${archetype.vocabularyTags.join(', ')}
`

  if (ideology) {
    prompt += `
## Government Ideology
- Xenophobia: ${ideology.xenophobia}/100
- Diplomacy: ${ideology.diplomacy}/100
- Militancy: ${ideology.militancy}/100
- Expansionism: ${ideology.expansionism}/100
- Determination: ${ideology.determination}/100
- Trade: ${ideology.trade}/100
`
  }

  if (gameState) {
    prompt += `
## Current Empire State
- Known systems: ${gameState.systemCount}
- Active fleets: ${gameState.fleetCount} (${gameState.militaryFleetCount} military, ${gameState.civilianFleetCount} civilian)
- Total ships: ${gameState.totalShipCount}
- Has built ships: ${gameState.hasBuiltFirstShip}
`
  }

  prompt += `
## Instructions
- Respond in character as this advisor. Be concise.
- Reference specific game data when relevant.
- For alerts: categorize as BRIEFING (informational), WARNING (needs attention), or ALERT (urgent).
- Keep responses under 200 words unless the user asks for detail.
`

  return prompt
}

export async function chat(
  message: string,
  archetypeId: ArchetypeId,
  ideology: Record<string, number> | null,
  gameState: GameStateSnapshot | null,
): Promise<string> {
  const model = await getModel()
  if (!model) {
    return 'Advisor not configured. Set up an AI provider in Settings.'
  }

  conversation.push({ role: 'user', content: message })

  const systemPrompt = buildSystemPrompt(archetypeId, ideology, gameState)

  const { text } = await generateText({
    model,
    system: systemPrompt,
    messages: conversation.map((m) => ({ role: m.role, content: m.content })),
  })

  conversation.push({ role: 'assistant', content: text })
  return text
}

export async function generateAlert(
  events: GameEvent[],
  archetypeId: ArchetypeId,
  ideology: Record<string, number> | null,
  gameState: GameStateSnapshot | null,
): Promise<AdvisorAlert | null> {
  if (events.length === 0) return null

  const model = await getModel()
  if (!model) return null

  const systemPrompt = buildSystemPrompt(archetypeId, ideology, gameState)
  const eventSummary = events.map((e) => `- ${e.description}`).join('\n')

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: `The following events were detected in the empire. Generate a brief in-character alert.
Categorize the severity as BRIEFING, WARNING, or ALERT.
Format: Start with the severity in brackets, then a short title on the first line, then the message body.
Example: [WARNING] Fleet Deployment Concern\nYour idle fleets...

Events:
${eventSummary}`,
  })

  const severityMatch = text.match(/^\[(BRIEFING|WARNING|ALERT)\]\s*(.*)/)
  const severity = (severityMatch?.[1]?.toLowerCase() ?? 'briefing') as AdvisorAlert['severity']
  const title = severityMatch?.[2]?.trim() ?? 'Advisor Notice'
  const content = severityMatch ? text.slice(text.indexOf('\n') + 1).trim() : text

  const alert: AdvisorAlert = {
    id: `alert-${Date.now()}`,
    severity,
    title,
    content,
    timestamp: Date.now(),
  }

  alerts.push(alert)
  return alert
}

export function getConversation(): ChatMessage[] {
  return [...conversation]
}

export function clearConversation(): void {
  conversation = []
}

export function getAlerts(): AdvisorAlert[] {
  return [...alerts]
}

export function clearAlerts(): void {
  alerts = []
}
