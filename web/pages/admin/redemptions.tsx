import { Col } from 'web/components/layout/col'
import { Page } from 'web/components/layout/page'
import { Title } from 'web/components/widgets/title'

export default function AdminCashouts() {
  return (
    <Page trackPageView="admin-redemptions">
      <Col className="gap-4">
        <Title>Redemptions</Title>
        <div className="text-ink-700 text-sm">
          Manual redemption processing is disabled for this StartupShell
          deployment.
        </div>
      </Col>
    </Page>
  )
}
