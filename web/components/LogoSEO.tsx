import Head from 'next/head'
import { DOMAIN } from 'common/envs/constants'

export function LogoSEO() {
  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: `{
      "@context": "https://schema.org",
      "@type": "Corporation",
      "url": "https://${DOMAIN}",
      "logo": "https://${DOMAIN}/logo.svg",
      "description": "Create your own prediction market. Unfold the future."
    }`,
        }}
      />
    </Head>
  )
}
