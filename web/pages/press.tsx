import { Col } from 'web/components/layout/col'
import { Page } from 'web/components/layout/page'
import { SEO } from 'web/components/SEO'
import { Title } from 'web/components/widgets/title'

export default function PressPage() {
  return (
    <Page trackPageView={'press page'}>
      <SEO
        title="Press Kit"
        description="Shell-on-me press and brand assets."
        url="/press"
      />
      <Col className="bg-canvas-0 mx-auto max-w-[700px] gap-4 rounded p-4 py-8 sm:p-8 sm:shadow-md">
        <Title>Press Kit</Title>
        <p className="text-ink-600">
          Press kit coming soon. For media inquiries, contact the Shell-on-me
          team.
        </p>
      </Col>
    </Page>
  )
}
