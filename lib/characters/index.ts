import { JINX_CHARACTER } from './jinx'
import type { CharacterDefinition } from './types'
import { VOLT_CHARACTER } from './volt'
import { MABEL_CHARACTER } from './mabel'
import { ZEKE_CHARACTER } from './zeke'
import { NOVA_CHARACTER } from './nova'
import { VELVET_CHARACTER } from './velvet'
import { TEMPEST_CHARACTER } from './tempest'
import { LUMA_CHARACTER } from './luma'
import { ECHO_CHARACTER } from './echo'

export const ALL_CHARACTERS: CharacterDefinition[] = [
  JINX_CHARACTER,
  VOLT_CHARACTER,
  MABEL_CHARACTER,
  ZEKE_CHARACTER,
  NOVA_CHARACTER,
  VELVET_CHARACTER,
  TEMPEST_CHARACTER,
  LUMA_CHARACTER,
  ECHO_CHARACTER,
]

export const DEFAULT_CHARACTER_ID = JINX_CHARACTER.id

export function getCharacterById(id: string | undefined | null): CharacterDefinition {
  if (!id) return JINX_CHARACTER
  return ALL_CHARACTERS.find((character) => character.id === id) ?? JINX_CHARACTER
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
