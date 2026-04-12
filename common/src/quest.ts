/** @deprecated Quest features have been removed */

export type QuestType = 'SHARES' | 'MARKETS_CREATED'

export const QUEST_DETAILS: Record<QuestType, { title: string }> = {
  SHARES: { title: 'Sharing' },
  MARKETS_CREATED: { title: 'Market Creation' },
}
