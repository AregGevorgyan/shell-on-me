'use client'
import clsx from 'clsx'
import { WebPriceInDollars, PaymentAmount } from 'common/economy'
import { ENV_CONFIG } from 'common/envs/constants'
import Image from 'next/image'
import { Row } from 'web/components/layout/row'
import { Button } from './buttons/button'
import { Modal } from './layout/modal'
import { AmountInput } from './widgets/amount-input'
import { Col } from './layout/col'
import { shortenNumber } from 'common/util/formatNumber'
import { TokenNumber } from './widgets/token-number'
import { firebaseLogin, User } from 'web/lib/firebase/users'

const BUY_MANA_GRAPHICS = [
  '/buy-mana-graphics/10k.png',
  '/buy-mana-graphics/25k.png',
  '/buy-mana-graphics/100k.png',
  '/buy-mana-graphics/1M.png',
]

// TODO: this should send stripe a redirect to the proper market/create page
export function AddFundsModal(props: {
  open: boolean
  setOpen(open: boolean): void
}) {
  const { open, setOpen } = props
  // TODO: check if they're registered already in gidx & get their status
  // const res = useAPIGetter('get-monitor-status-gidx', {})

  return (
    <Modal
      open={open}
      setOpen={setOpen}
      size="lg"
      className="bg-canvas-0 text-ink-1000 rounded-md p-8"
    >
      <BuyManaTab />
      {/* <Tabs
        trackingName="buy modal tabs"
        className="[&_svg]:hidden" // hide carousel switcher
        tabs={buildArray(
          {
            title: 'Buy mana',
            content: <BuyManaTab onClose={() => setOpen(false)} />,
          },
          {
            title: 'Earn free mana',
            content: (
              <>
                <div className="my-4">Other ways to earn mana:</div>
                <OtherWaysToGetMana />
              </>
            ),
          }
        )}
      /> */}
    </Modal>
  )
}

export function BuyManaTab() {
  return (
    <Col className="gap-2">
      <div className="text-ink-1000 text-sm">
        Real-money mana purchases are disabled for this StartupShell deployment.
      </div>
    </Col>
  )
}

export function PriceTile(props: {
  amounts: PaymentAmount
  index: number
  loadingPrice: WebPriceInDollars | null
  disabled: boolean
  user: User | null | undefined
  onClick: () => void
}) {
  const { loadingPrice, onClick, amounts, index, user } = props
  const { mana, priceInDollars, bonusInDollars } = amounts

  const isCurrentlyLoading = loadingPrice === priceInDollars
  const disabled = props.disabled || (loadingPrice && !isCurrentlyLoading)

  const onClickHandler = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault()
      firebaseLogin()
      return
    }
    onClick()
  }

  const imgSrc =
    BUY_MANA_GRAPHICS[Math.min(index, BUY_MANA_GRAPHICS.length - 1)]
  const tile = (
    <button
      className={clsx(
        ' bg-canvas-0 group relative flex h-fit w-full flex-col items-center rounded text-center shadow transition-all ',
        disabled
          ? 'pointer-events-none cursor-not-allowed opacity-50'
          : 'opacity-90 ring-2 ring-opacity-0 hover:opacity-100 hover:ring-opacity-100',
        'ring-indigo-600',
        isCurrentlyLoading && 'pointer-events-none animate-pulse cursor-wait'
      )}
      type={'submit'}
      onClick={onClickHandler}
    >
      <Col className={' w-full items-center rounded-t px-4 pb-2 pt-4'}>
        <Image
          src={imgSrc}
          alt={`${shortenNumber(mana)} mana`}
          className="100%"
          width={120}
          height={120}
        />

        <div
          className={clsx(
            'text-ink-1000 text-lg font-semibold',
            imgSrc == '/buy-mana-graphics/10k.png' ||
              imgSrc == '/buy-mana-graphics/25k.png'
              ? '-mt-6'
              : '-mt-3'
          )}
        >
          Ṁ{shortenNumber(mana)}{' '}
        </div>
        {bonusInDollars > 0 && (
          <Row
            className={clsx(
              `mx-auto items-center justify-center gap-1 whitespace-nowrap text-sm text-amber-600 dark:text-amber-400 `
            )}
          >
            <span>+</span>
            <TokenNumber
              coinType="sweepies"
              className="text-lg font-bold"
              amount={bonusInDollars}
              numberType="short"
            />{' '}
            <span>free</span>
          </Row>
        )}
      </Col>

      <div
        className={clsx(
          'w-full rounded-b px-4 py-1 text-lg font-semibold text-white sm:text-xl',
          'bg-indigo-600'
        )}
      >
        Buy ${priceInDollars}
      </div>
    </button>
  )
  return tile
}

export const SpiceToManaForm = (props: {
  onBack: () => void
  onClose: () => void
}) => {
  void props.onClose

  return (
    <>
      <div className="my-4">
        Prize point conversion is disabled for this StartupShell deployment.
      </div>
      <div className="mt-4 flex gap-2">
        <Button color="gray" onClick={props.onBack}>
          Back
        </Button>
      </div>
    </>
  )
}

export const use24hrUsdPurchasesInDollars = (userId: string) => {
  void userId
  return 0
}
