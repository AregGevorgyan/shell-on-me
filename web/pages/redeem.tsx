import { Page } from 'web/components/layout/page'
import { Col } from 'web/components/layout/col'
import { SEO } from 'web/components/SEO'

export type CashoutPagesType = 'options' | 'custom-mana' | 'redeem-usd'

export default function RedeemPage() {
  return (
    <Page trackPageView={'redeem page'}>
      <SEO
        title="Redeem"
        description="Cashout and redemption flows are disabled."
        url="/redeem"
      />
      <Col className="mx-auto max-w-xl p-4">
        <div className="text-ink-700 text-sm">
          Redemption and cashout flows are disabled for this StartupShell
          deployment.
        </div>
      </Col>
    </Page>
  )
}
