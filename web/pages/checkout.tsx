import { Page } from 'web/components/layout/page'
import { Col } from 'web/components/layout/col'

const CheckoutPage = () => {
  return (
    <Page className={'p-3'} trackPageView={'checkout page'} hideFooter>
      <Col className="mx-auto max-w-xl">
        <div className="text-ink-700 text-sm">
          Checkout is disabled for this StartupShell deployment.
        </div>
      </Col>
    </Page>
  )
}

export default CheckoutPage
