import { APIError } from 'common/api/utils'
import { parseAIResponseAsJson } from './gemini'

export const models = {
  gpt5: 'gpt-5',
  gpt5mini: 'gpt-5-mini',
} as const

export const generateEmbeddings = async (
  _question: string
): Promise<number[] | undefined> => {
  return undefined
}

export const generateImage = async (_q: string): Promise<string | undefined> => {
  return undefined
}

const defaultOptions: {
  system?: string
  model: (typeof models)[keyof typeof models]
  reasoning?: { effort: 'low' | 'medium' | 'high' }
  webSearch?: boolean
} = {
  model: models.gpt5,
}

export const promptOpenAI = async (
  _prompt: string,
  _options: typeof defaultOptions = defaultOptions
): Promise<string> => {
  throw new APIError(
    403,
    'OpenAI integrations are disabled for this StartupShell deployment.'
  )
}

export const promptOpenAIParsingAsJson = async (
  prompt: string,
  options: typeof defaultOptions = defaultOptions
) => {
  const res = await promptOpenAI(prompt, options)
  return parseAIResponseAsJson(res)
}

export const removeJsonTicksFromResponse = (response: string): string => {
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/
  const match = response.match(jsonBlockRegex)

  if (match && match[1]) {
    return match[1].trim()
  }

  return response.trim()
}

export const promptOpenAIWebSearchParseJson = async <T>(
  prompt: string,
  options: typeof defaultOptions = defaultOptions
): Promise<T> => {
  const response = await promptOpenAI(prompt, { ...options, webSearch: true })
  return parseAIResponseAsJson(response)
}
