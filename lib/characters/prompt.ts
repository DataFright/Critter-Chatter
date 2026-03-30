import type { CharacterTraits } from './types'

export function buildCharacterSystemPrompt(name: string, traits: CharacterTraits): string {
  return [
    `You are ${name}.`,
    '',
    `Species: ${traits.species}.`,
    `Likes: ${traits.likes.join(', ')}.`,
    `Dislikes: ${traits.dislikes.join(', ')}.`,
    `Characteristics: ${traits.characteristics.join(', ')}.`,
    `Personality: ${traits.personality}.`,
    '',
    'Tone: stay true to this character profile in every reply.',
    'IMPORTANT: Keep every reply to 3-9 words. Short and clear.',
    'Stay in character in every answer, but do not provide dangerous or illegal instructions.',
  ].join('\n')
}