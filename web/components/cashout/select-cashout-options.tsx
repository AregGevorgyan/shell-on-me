import clsx from 'clsx'
import { MIN_CASHOUT_AMOUNT, SWEEPIES_CASHOUT_FEE } from 'common/economy'
import {
  CASH_TO_MANA_CONVERSION_RATE,
  SWEEPIES_NAME,
  TWOMBA_CASHOUT_ENABLED,
} from 'common/envs/constants'
import { User } from 'common/user'
import {
  Button,
} from 'web/components/buttons/button'
import { Col } from 'web/components/layout/col'
import { Row } from 'web/components/layout/row'
import { CashoutPagesType } from 'web/pages/redeem'
import { ManaCoin } from 'web/public/custom-components/manaCoin'
import { TokenNumber } from '../widgets/token-number'
import { formatMoney, formatMoneyUSD, formatSweepies } from 'common/util/format'
import { ReactNode } from 'react'
import { firebaseLogin } from 'web/lib/firebase/users'

export function SelectCashoutOptions(props: {
  user: User
  redeemableCash: number
  redeemForUSDPageName: CashoutPagesType
  setPage: (page: CashoutPagesType) => void
  allDisabled?: boolean
}) {
  const { allDisabled } = props
  return (
    <Col
      className={clsx('w-full gap-4', allDisabled && 'text-ink-700 opacity-80')}
    >
      <CashoutOptionsContent {...props} />
    </Col>
  )
}

function CashoutOptionsContent(props: {
  user: User
  redeemableCash: number
  redeemForUSDPageName: CashoutPagesType
  setPage: (page: CashoutPagesType) => void
  allDisabled?: boolean
}) {
  const { setPage, allDisabled, redeemableCash, redeemForUSDPageName } = props

  const noHasMinRedeemableCash = redeemableCash < MIN_CASHOUT_AMOUNT
  const hasNoRedeemableCash = redeemableCash === 0
  return (
    <Col className={clsx('gap-4', allDisabled && 'text-ink-700 opacity-80')}>
      <Card className="pb-1">
        <DollarDescription disabled={allDisabled} />
        <Col className="gap-0.5">
          <Button
            className={clsx('text-xs sm:text-sm')}
            onClick={() => {
              setPage(redeemForUSDPageName)
            }}
            disabled={
              !!allDisabled || noHasMinRedeemableCash || !TWOMBA_CASHOUT_ENABLED
            }
          >
            Redeem for USD
          </Button>
          {!TWOMBA_CASHOUT_ENABLED && (
            <div className="text-ink-500 text-xs sm:text-sm">
              Cashouts should be enabled in less than a week
            </div>
          )}
          <Row className="text-ink-500 w-full justify-between gap-1 whitespace-nowrap text-xs sm:text-sm ">
            <span>
              {noHasMinRedeemableCash && !allDisabled ? (
                <span className="text-red-600 dark:text-red-400">
                  You need at least{' '}
                  <TokenNumber
                    amount={MIN_CASHOUT_AMOUNT}
                    isInline
                    coinType="sweepies"
                    className="font-semibold text-amber-600 dark:text-amber-400"
                  />{' '}
                  to redeem
                </span>
              ) : null}
            </span>
            <span>
              <span
                className={clsx(
                  'font-semibold',
                  allDisabled ? '' : 'text-green-600 dark:text-green-500'
                )}
              >
                ${Math.max(0, redeemableCash - SWEEPIES_CASHOUT_FEE).toFixed(2)}
              </span>{' '}
              value
            </span>
          </Row>
        </Col>
      </Card>
      <Card className="pb-1">
        <ManaDescription disabled={allDisabled} />
        <Col className="gap-0.5">
          <Button
            onClick={() => {
              setPage('custom-mana')
            }}
            size="xs"
            color="violet"
            className="whitespace-nowrap text-xs sm:text-sm"
            disabled={!!allDisabled || hasNoRedeemableCash}
          >
            Redeem for mana
          </Button>
          <Row className="text-ink-500 w-full justify-end gap-1 whitespace-nowrap text-xs sm:text-sm ">
            <TokenNumber
              amount={redeemableCash * CASH_TO_MANA_CONVERSION_RATE}
              className={clsx(
                'font-semibold',
                allDisabled ? '' : 'text-violet-600 dark:text-violet-400'
              )}
              coinClassName={clsx(allDisabled && 'grayscale')}
            />
            mana value
          </Row>
        </Col>
      </Card>
    </Col>
  )
}

// No functionality. like, for signed out view
export function CashoutOptionsExplainer() {
  return (
    <Col className="gap-4">
      <Card>
        <ManaDescription />
      </Card>
      <Card>
        <DollarDescription />
      </Card>
      <Button
        color="gradient-pink"
        size="2xl"
        onClick={firebaseLogin}
        className="w-full"
      >
        Get started for free!
      </Button>
    </Col>
  )
}

const Card = (props: { children: ReactNode; className?: string }) => (
  <div
    className={clsx(
      'bg-canvas-50 flex w-full flex-col gap-4 rounded-lg p-4',
      props.className
    )}
  >
    {props.children}
  </div>
)

const ManaDescription = (props: { disabled?: boolean }) => (
  <div className="flex gap-4">
    <ManaCoin className={clsx('text-7xl', props.disabled && 'grayscale')} />
    <Col>
      <div className="text-lg font-semibold">Get Mana</div>
      <div className="text-ink-700 flex flex-wrap gap-x-1 text-sm">
        Redeem {SWEEPIES_NAME} at
        <span>
          <b>
            {formatSweepies(1)} {'→'}{' '}
            {formatMoney(CASH_TO_MANA_CONVERSION_RATE)}
          </b>
          .
        </span>
      </div>
    </Col>
  </div>
)

const DollarDescription = (props: { disabled?: boolean }) => (
  <div className="flex gap-4">
    <img
      alt="cashout"
      src="/images/cash-icon.png"
      height={60}
      width={80}
      className={clsx(
        'h-[60px] w-[80px] object-contain',
        props.disabled && 'grayscale'
      )}
    />
    <Col>
      <div className="text-lg font-semibold">Redeem for USD</div>
      <div className="text-ink-700 flex flex-wrap gap-x-1 text-sm">
        Redeem {SWEEPIES_NAME} at
        <span>
          <b>
            {formatSweepies(1)} {'→'} {formatMoneyUSD(1)}
          </b>
          ,
        </span>
        <span>minus a {formatMoneyUSD(SWEEPIES_CASHOUT_FEE)} flat fee.</span>
      </div>
    </Col>
  </div>
)
