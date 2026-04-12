/** @deprecated Quest features have been removed */
import { User } from 'common/user'

/** No-op: quest completion is disabled */
export const completeSharingQuest = async (_user: User) => {
  return { status: 'skipped' }
}

/** No-op: quest completion is disabled */
export const completeCalculatedQuestFromTrigger = async (
  _user: User,
  _questType: string,
  _eventId?: string,
  _contractId?: string
) => {
  return
}
