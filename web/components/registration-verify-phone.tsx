import { useEffect } from 'react'
import { Button } from 'web/components/buttons/button'
import { Row } from './layout/row'

export function RegistrationVerifyPhone(props: {
  cancel: () => void
  next: () => void
}) {
  const { next, cancel } = props

  useEffect(() => {
    // Phone verification is intentionally disabled in StartupShell.
  }, [])

  return (
    <>
      <span className={'mx-auto text-2xl'}>Phone verification disabled</span>
      <Row className="text-ink-700 pl-5 text-sm">
        This deployment does not use SMS phone verification.
      </Row>
      <Row className="mt-4 justify-end gap-2">
        <Button color={'gray-white'} onClick={cancel}>
          Back
        </Button>
        <Button onClick={next}>Continue</Button>
      </Row>
    </>
  )
}
