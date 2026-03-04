import { SEO } from 'web/components/SEO'
import { Col } from 'web/components/layout/col'
import { Page } from 'web/components/layout/page'

export default function OldCharitySlugPage() {
  return (
    <Page trackPageView="charity-disabled">
      <SEO
        title="Charity"
        description="Charity redemption flows are disabled."
        url="/old-charity"
      />
      <Col className="mx-auto max-w-xl p-4">
        <div className="text-ink-700 text-sm">
          Charity redemption flows are disabled for this StartupShell
          deployment.
        </div>
      </Col>
    </Page>
  )
}
