import { useState } from 'react'
import { useNativeMessages } from 'web/hooks/use-native-messages'
import { MesageTypeMap, nativeToWebMessageType } from 'common/native-message'
import { WebPriceInDollars } from 'common/economy'
import { postMessageToNative } from 'web/lib/native/post-message'

export function useIosPurchases(
  setError: (error: string | null) => void,
  setLoadingPrice: (loading: WebPriceInDollars | null) => void,
  onSuccess: () => void
) {
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null)

  const handleIapReceipt = async <T extends nativeToWebMessageType>(
    type: T,
    data: MesageTypeMap[T]
  ) => {
    if (type === 'iapReceipt' && !loadingMessage) {
      void data
      setLoadingMessage(null)
      setLoadingPrice(null)
      setError(
        'In-app purchases are disabled for this StartupShell deployment.'
      )
    } else if (type === 'iapError') {
      setError('Error during purchase! Try again.')
      setLoadingMessage(null)
      setLoadingPrice(null)
    }
  }

  useNativeMessages(['iapReceipt', 'iapError'], handleIapReceipt)

  const initiatePurchaseInDollars = (amountInDollars: number) => {
    void amountInDollars
    setError(null)
    setLoadingPrice(null)
    setLoadingMessage(null)
    setError('In-app purchases are disabled for this StartupShell deployment.')
    postMessageToNative('log', {
      args: ['iOS purchase disabled in StartupShell deployment'],
    })
  }

  return {
    loadingMessage,
    setError,
    initiatePurchaseInDollars,
  }
}
