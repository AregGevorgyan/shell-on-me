import { Col } from 'web/components/layout/col'
import { SEO } from 'web/components/SEO'
import { Title } from 'web/components/widgets/title'
import { Page } from 'web/components/layout/page'

export default function ManachanPage() {
  return (
    <Page trackPageView={'manachan page'}>
      <SEO
        title="Not available"
        description="This feature is not available."
        url="/manachan"
      />
      <Col className="bg-canvas-0 mx-auto max-w-[700px] gap-4 rounded p-4 py-8 sm:p-8 sm:shadow-md">
        <Title>Not available</Title>
        <div className="text-ink-700 text-sm">
          This feature is not available in this deployment.
        </div>
      </Col>
    </Page>
  )
}
