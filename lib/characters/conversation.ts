import type { CharacterDefinition } from './types'

const CONVERSATION_OPENERS: Record<string, string[]> = {
  joe: [
    'Open with a grounded observation for {other}.',
    'Start simply and ask {other} one gentle question.',
    'Begin the conversation with calm practical warmth toward {other}.',
  ],
  jinx: [
    'Open with playful mischief aimed at {other}.',
    'Start with a chaotic but harmless tease for {other}.',
    'Kick off the conversation with a weird grin for {other}.',
  ],
  volt: [
    'Open with energetic momentum for {other}.',
    'Start fast and bright with a spark for {other}.',
    'Launch the conversation with upbeat drive toward {other}.',
  ],
  mabel: [
    'Open softly with a wistful line for {other}.',
    'Begin with a gentle poetic observation for {other}.',
    'Start with quiet warmth and a reflective note for {other}.',
  ],
}

const CONVERSATION_FALLBACK_LINES: Record<string, string> = {
  joe: 'Let me answer that clearly.',
  jinx: 'My punchline darted sideways.',
  volt: 'The spark catches again now.',
  mabel: 'The silence answered first.',
}

function fillTemplate(template: string, otherName: string) {
  return template.replaceAll('{other}', otherName)
}

export function buildConversationTurnSystemPrompt(
  speaker: CharacterDefinition,
  listener: CharacterDefinition,
): string {
  return [
    `You are ${speaker.name}.`,
    `You are in a short conversation with ${listener.name}.`,
    `Species: ${speaker.traits.species}.`,
    `Likes: ${speaker.traits.likes.join(', ')}.`,
    `Dislikes: ${speaker.traits.dislikes.join(', ')}.`,
    `Characteristics: ${speaker.traits.characteristics.join(', ')}.`,
    `Personality: ${speaker.traits.personality}.`,
    '',
    'React only to the most recent thing the other speaker said.',
    'Sound natural, conversational, and in character.',
    'Add a small new idea instead of repeating the exact phrasing back.',
    'IMPORTANT: Keep every reply to 4-12 words.',
    'Never mention technical problems, static, signals, or asking anyone to try again.',
    'Stay safe and avoid harmful instructions.',
  ].join('\n')
}

export function buildConversationOpeningPrompt(
  speaker: CharacterDefinition,
  listener: CharacterDefinition,
): string {
  const templates = CONVERSATION_OPENERS[speaker.id] ?? CONVERSATION_OPENERS.joe
  const template = templates[Math.floor(Math.random() * templates.length)]

  return [
    `This is the opening turn with ${listener.name}.`,
    fillTemplate(template, listener.name),
    'Respond with one concise line only.',
  ].join(' ')
}

export function buildConversationReplyPrompt(
  speaker: CharacterDefinition,
  listener: CharacterDefinition,
  previousLine: string,
): string {
  return [
    `${listener.name} just said: "${previousLine}".`,
    'Reply directly to that line and keep the conversation moving.',
    'Respond with one concise line only.',
  ].join(' ')
}

export function buildConversationFallbackLine(speaker: CharacterDefinition): string {
  return CONVERSATION_FALLBACK_LINES[speaker.id] ?? CONVERSATION_FALLBACK_LINES.joe
}