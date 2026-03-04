import { SWEEPIES_NAME } from 'common/envs/constants'
import { Button } from '../buttons/button'
import { Col } from '../layout/col'
import { Row } from '../layout/row'

export const CashToManaForm = (props: {
  onBack: () => void
  redeemableCash: number
}) => {
  void props.redeemableCash

  return (
    <Col className="w-full shrink-0 gap-4">
      <div>
        {SWEEPIES_NAME} to mana conversion is disabled for this StartupShell
        deployment.
      </div>
      <Row className="mt-2 w-full gap-2">
        <Button color="gray" onClick={props.onBack}>
          Back
        </Button>
      </Row>
    </Col>
  )
}
