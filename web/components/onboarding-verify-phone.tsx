import { Col } from 'web/components/layout/col'
import { Button } from 'web/components/buttons/button'

export function OnboardingVerifyPhone(props: { onClose: () => void }) {
  const { onClose } = props

  return (
    <Col className="items-center gap-4 p-2 text-center text-lg">
      <div className="text-ink-700">
        Phone verification is disabled for this StartupShell deployment.
      </div>
      <Button onClick={onClose}>Close</Button>
    </Col>
  )
}
