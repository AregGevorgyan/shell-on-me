import { Page } from 'web/components/layout/page'
import { Col } from 'web/components/layout/col'
import { Row } from 'web/components/layout/row'
import { useRedirectIfSignedIn } from 'web/hooks/use-redirect-if-signed-in'
import { ManifoldLogo } from 'web/components/nav/manifold-logo'
import { LogoSEO } from 'web/components/LogoSEO'
import { Button } from 'web/components/buttons/button'
import { firebaseLogin } from 'web/lib/firebase/users'
import { useState } from 'react'

function GoogleIcon() {
  return (
    <svg
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="block h-5 w-5"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      ></path>
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      ></path>
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      ></path>
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      ></path>
      <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
  )
}

export default function LoginPage() {
  const [loginError, setLoginError] = useState<string | null>(null)
  useRedirectIfSignedIn()

  return (
    <Page trackPageView={'login page'} hideSidebar>
      <Col className="mx-auto mt-8 w-full max-w-md gap-8 px-4">
        <Row className="items-center justify-center">
          <ManifoldLogo className="!w-auto" />
          <LogoSEO />
        </Row>

        <Col className="bg-canvas-0 flex w-full flex-col gap-8 rounded-lg p-8 shadow-md">
          <Row className="w-full justify-center">
            <h1 className="text-primary-500 text-center text-2xl font-medium">
              Log in to predict
            </h1>
          </Row>
          <Col className="gap-4">
            <Button
              className="border-ink-100 gap-2 border"
              color="gray-white"
              size="lg"
              onClick={async () => {
                try {
                  setLoginError(null)
                  await firebaseLogin()
                } catch (e) {
                  const message =
                    e instanceof Error
                      ? e.message
                      : 'Sign in with your @startupshell.org Google account.'
                  setLoginError(message)
                }
              }}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
            {loginError && (
              <div className="text-primary-600 text-sm">{loginError}</div>
            )}
          </Col>
        </Col>
      </Col>
    </Page>
  )
}
