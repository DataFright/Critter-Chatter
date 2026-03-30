export const MODEL_CHAIN = [
  'stepfun/step-3.5-flash:free',
  'google/gemma-3-4b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
] as const

export type Model = (typeof MODEL_CHAIN)[number]
