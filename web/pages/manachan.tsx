import Image from 'next/image'
import { Col } from 'web/components/layout/col'
import { SEO } from 'web/components/SEO'
import { Title } from 'web/components/widgets/title'
import { Page } from 'web/components/layout/page'

export default function ManachanPage() {
  return (
    <Page trackPageView={'manachan page'}>
      <SEO
        title="Mana-chan speaks!"
        description="Mana-chan is Manifold's official anime spokesgirl"
        image="/manachan.png"
      />

      <Col className="bg-canvas-0 mx-auto max-w-[700px] gap-4 rounded p-4 py-8 sm:p-8 sm:shadow-md">
        <Title>Mana-chan speaks!</Title>
        <Image
          src="/manachan.png"
          width={300}
          height={300}
          alt=""
          className="self-center"
        />
        <div className="text-ink-700 text-sm">
          Mana-chan tweet purchases are disabled for this StartupShell
          deployment.
        </div>
      </Col>
    </Page>
  )
}
