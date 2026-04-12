/** @deprecated Streak features have been removed */
import { User } from 'web/lib/firebase/users'

export const BettingStreakModal = (_props: {
  isOpen: boolean
  setOpen: (open: boolean) => void
  currentUser: User | null | undefined
}) => null
