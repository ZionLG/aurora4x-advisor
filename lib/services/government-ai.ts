/**
 * Government AI Service
 *
 * Uses Vercel AI SDK to generate ministry briefings and chat responses.
 * Each ministry speaks in character based on the government archetype + ministry context.
 */

import { generateText } from 'ai'
import { getModel } from './ai-provider'
import { getArchetype } from '@/lib/advisor'
import type { Government, Ministry, Briefing, GameEvent } from '@/shared/types'
import type { GameStateSnapshot } from './game-state-analyzer'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Per-ministry conversation history
const conversations = new Map<string, ChatMessage[]>()

// All briefings
let briefings: Briefing[] = []

/**
 * Built-in event tags
 */
export const EVENT_TAGS = [
  { id: 'military', label: 'Military', desc: 'Fleet combat and defense' },
  { id: 'fleet', label: 'Fleet', desc: 'Fleet composition and deployment' },
  { id: 'minerals', label: 'Minerals', desc: 'Mineral stockpiles and shortages' },
  { id: 'industry', label: 'Industry', desc: 'Production and construction' },
  { id: 'research', label: 'Research', desc: 'Technology and projects' },
  { id: 'exploration', label: 'Exploration', desc: 'Survey and discovery' },
  { id: 'diplomacy', label: 'Diplomacy', desc: 'Alien contact and treaties' },
  { id: 'economy', label: 'Economy', desc: 'Wealth, trade, population' },
]

function buildSystemPrompt(gov: Government, ministry: Ministry | null, gameState: GameStateSnapshot | null): string {
  const archetype = getArchetype(gov.archetypeId)

  const profile = gov.profile

  let prompt = `You are a department of the government of a space-faring civilization in the game Aurora 4X.

## Government
- Archetype: ${archetype.name} — ${archetype.description}
- Tone: ${archetype.toneDescriptors.join(', ')}
${profile ? `\n## Government Profile: ${profile.name}\n${profile.flavor}\nKeywords: ${profile.keywords.join(', ')}\n` : ''}
- Ideology: Xenophobia ${gov.ideology.xenophobia}/100, Diplomacy ${gov.ideology.diplomacy}/100, Militancy ${gov.ideology.militancy}/100, Expansionism ${gov.ideology.expansionism}/100, Determination ${gov.ideology.determination}/100, Trade ${gov.ideology.trade}/100
`

  if (ministry) {
    prompt += `
## Your Ministry
- Name: ${ministry.name}
- Domain: ${ministry.tags.join(', ')}
${ministry.description ? `- Description: ${ministry.description}` : ''}
${ministry.toneOverride ? `- Communication tone: ${ministry.toneOverride}` : ''}
`
  } else {
    prompt += `
## Your Role
You are the Cabinet — the general government body handling matters that don't fall under a specific ministry.
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
- Respond in character. Be concise.
- Reference specific game data when relevant.
- Reference relevant in-game personnel (commanders, governors) when appropriate.
- Keep responses under 200 words unless asked for detail.
`

  return prompt
}

/**
 * Route an event to the best-matching ministry.
 * Returns null if no ministry matches (routes to Cabinet).
 */
function routeEventToMinistry(event: GameEvent, ministries: Ministry[]): Ministry | null {
  let bestMatch: Ministry | null = null
  let bestOverlap = 0

  for (const ministry of ministries) {
    const overlap = event.tags.filter((t) => ministry.tags.includes(t)).length
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      bestMatch = ministry
    }
  }

  return bestMatch
}

/**
 * Generate a briefing for a set of events.
 */
export async function generateBriefing(
  events: GameEvent[],
  gov: Government,
  ministry: Ministry | null,
  gameState: GameStateSnapshot | null
): Promise<Briefing | null> {
  if (events.length === 0) return null

  const model = await getModel()
  if (!model) return null

  // Route to ministry if not specified
  const targetMinistry = ministry ?? routeEventToMinistry(events[0], gov.ministries)

  const systemPrompt = buildSystemPrompt(gov, targetMinistry, gameState)
  const eventSummary = events.map((e) => `- [${e.severity.toUpperCase()}] ${e.description}`).join('\n')

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: `The following events were detected. Generate a brief in-character briefing.

Events:
${eventSummary}`,
  })

  const briefing: Briefing = {
    id: `briefing-${Date.now()}`,
    ministryId: targetMinistry?.id ?? null,
    ministryName: targetMinistry?.name ?? 'Cabinet',
    event: events[0],
    response: text,
    timestamp: Date.now(),
  }

  briefings.push(briefing)
  return briefing
}

/**
 * Chat with a specific ministry.
 */
export async function chat(
  ministryId: string,
  message: string,
  gov: Government,
  gameState: GameStateSnapshot | null
): Promise<string> {
  const model = await getModel()
  if (!model) {
    return 'AI provider not configured. Set one up in Settings.'
  }

  const ministry = gov.ministries.find((m) => m.id === ministryId) ?? null
  const history = conversations.get(ministryId) ?? []

  history.push({ role: 'user', content: message })

  const systemPrompt = buildSystemPrompt(gov, ministry, gameState)

  const { text } = await generateText({
    model,
    system: systemPrompt,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  })

  history.push({ role: 'assistant', content: text })
  conversations.set(ministryId, history)

  return text
}

export function getConversation(ministryId: string): ChatMessage[] {
  return [...(conversations.get(ministryId) ?? [])]
}

export function clearConversation(ministryId: string): void {
  conversations.delete(ministryId)
}

export function getBriefings(): Briefing[] {
  return [...briefings]
}

export function getBriefingsForMinistry(ministryId: string): Briefing[] {
  return briefings.filter((b) => b.ministryId === ministryId)
}

export function clearBriefings(): void {
  briefings = []
}
