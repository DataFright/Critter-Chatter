export interface CharacterTraits {
  species: string
  likes: string[]
  dislikes: string[]
  characteristics: string[]
  personality: string
}

export interface CharacterDefinition {
  id: string
  name: string
  subtitle: string
  avatar: string
  traits: CharacterTraits
  systemPrompt: string
  starterMessage: string
  errorFallbackMessage: string
}