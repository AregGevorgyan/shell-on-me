import { Col } from 'web/components/layout/col'
import { SEO } from 'web/components/SEO'
import { Title } from 'web/components/widgets/title'
import { Page } from 'web/components/layout/page'
import { useRedirectIfSignedOut } from 'web/hooks/use-redirect-if-signed-out'
export default function AddFundsPage() {
  useRedirectIfSignedOut()

  return (
    <Page trackPageView={'add funds'}>
      <SEO
        title="Get Shell Tokens"
        description="Buy Shell Tokens to trade in your favorite questions on Manifold"
        url="/add-funds"
      />

      <Col className="bg-canvas-0 mx-auto max-w-[700px] rounded p-4 py-8 sm:p-8 sm:shadow-md">
        <Title>Get Shell Tokens</Title>
        <div className="text-ink-700 mt-2 text-sm">
          Real-money Shell Token purchases are disabled for this StartupShell
          deployment.
        </div>
      </Col>
    </Page>
  )
}
