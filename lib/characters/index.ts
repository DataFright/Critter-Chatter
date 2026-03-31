import { JOE_CHARACTER } from './joe'
import { JINX_CHARACTER } from './jinx'
import type { CharacterDefinition } from './types'
import { VOLT_CHARACTER } from './volt'
import { MABEL_CHARACTER } from './mabel'

export const ALL_CHARACTERS: CharacterDefinition[] = [
  JOE_CHARACTER,
  JINX_CHARACTER,
  VOLT_CHARACTER,
  MABEL_CHARACTER,
]

export const DEFAULT_CHARACTER_ID = JOE_CHARACTER.id

export function getCharacterById(id: string | undefined | null): CharacterDefinition {
  if (!id) return JOE_CHARACTER
  return ALL_CHARACTERS.find((character) => character.id === id) ?? JOE_CHARACTER
}

export function isCharacterId(id: string | undefined | null): boolean {
  if (!id) return false
  return ALL_CHARACTERS.some((character) => character.id === id)
}

export {
  buildConversationFallbackLine,
  buildConversationOpeningPrompt,
  buildConversationReplyPrompt,
  buildConversationTurnSystemPrompt,
} from './conversation'
