import type { CharacterDefinition } from './types'

const CONVERSATION_OPENERS: Record<string, string[]> = {
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
  zeke: [
    'Open by pitching a ridiculous stunt to {other}.',
    'Start with a cliff-edge dare for {other}.',
    'Kick off with loud thrill-energy aimed at {other}.',
  ],
  nova: [
    'Open with a cosmic concept sketch for {other}.',
    'Start by inviting {other} into a strange invention idea.',
    'Begin with a brilliant abstract image for {other}.',
  ],
  velvet: [
    'Open quietly with a precise observation about {other}.',
    'Start with a subtle strategic hint to {other}.',
    'Begin with calm, controlled pressure toward {other}.',
  ],
  tempest: [
    'Open with restrained force and calm control for {other}.',
    'Start in measured silence, then challenge {other} directly.',
    'Begin with disciplined intensity aimed at {other}.',
  ],
  luma: [
    'Open softly like a drifting dream toward {other}.',
    'Start with a fluid image and invite {other} in.',
    'Begin gently with surreal warmth for {other}.',
  ],
  echo: [
    'Open with ancient calm and gravity for {other}.',
    'Start with one deep and reflective note to {other}.',
    'Begin slowly, with quiet oceanic weight for {other}.',
  ],
}

const CONVERSATION_FALLBACK_LINES: Record<string, string> = {
  jinx: 'My punchline darted sideways.',
  volt: 'The spark catches again now.',
  mabel: 'The silence answered first.',
  zeke: 'I missed the jump. Rewind me.',
  nova: 'The idea flared out. Another pass.',
  velvet: 'The whisper slipped. Continue.',
  tempest: 'Control slipped for a second. I am steady now.',
  luma: 'The current blurred. Let me drift back in.',
  echo: 'The depth answered late. I can speak again.',
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
  const templates = CONVERSATION_OPENERS[speaker.id] ?? CONVERSATION_OPENERS.jinx
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
  return CONVERSATION_FALLBACK_LINES[speaker.id] ?? CONVERSATION_FALLBACK_LINES.jinx
}