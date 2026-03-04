import { APIError } from 'common/api/utils'
import { parseAIResponseAsJson } from './gemini'

export const models = {
  sonnet3: 'claude-3-7-sonnet-latest' as const,
  haiku: 'claude-haiku-4-5-20251001' as const,
  sonnet45: 'claude-sonnet-4-5' as const,
}

export type model_types = (typeof models)[keyof typeof models]

export const promptClaudeStream = async function* (
  _prompt: string,
  _options: { system?: string; model?: model_types; webSearch?: boolean } = {}
): AsyncGenerator<string, void, unknown> {
  if (false) yield ''
  throw new APIError(
    403,
    'Anthropic integrations are disabled for this StartupShell deployment.'
  )
}

export const promptClaude = async (
  _prompt: string,
  _options: { system?: string; model?: model_types; webSearch?: boolean } = {}
) => {
  throw new APIError(
    403,
    'Anthropic integrations are disabled for this StartupShell deployment.'
  )
}

export const promptClaudeParsingJson = async <T>(
  prompt: string,
  options: { system?: string; model?: model_types; webSearch?: boolean } = {}
): Promise<T> => {
  const response = await promptClaude(prompt, options)
  return parseAIResponseAsJson(response)
}
