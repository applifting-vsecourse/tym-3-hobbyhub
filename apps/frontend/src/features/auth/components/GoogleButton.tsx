import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { authClient } from "@/features/auth/lib/auth-client"
import { AuthError, authErrorMessage } from "@/features/auth/lib/authErrors"

/** What a new account needs besides Google's own data (F-03.1, #174). */
export type GoogleRegistration = {
  readonly gender: "MALE" | "FEMALE"
  readonly birthYear: number
  readonly adulthoodConfirmed: true
  readonly termsAccepted: true
}

type GoogleButtonProps = {
  /** The page the visitor came from; kept through Google and back. */
  readonly from?: string
  /**
   * Given on the sign-up page: collects and checks the registration fields
   * first (null = not valid yet) and makes Google create the account.
   * Without it the button only signs in an account that already exists.
   */
  readonly getRegistration?: () => Promise<GoogleRegistration | null>
}

function GoogleLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

// The backend lives on another origin, so the return addresses are absolute.
const addressOf = (path: string, from: string | undefined) =>
  `${window.location.origin}${path}${from ? `?from=${encodeURIComponent(from)}` : ""}`

/** "Continue with Google": leaves for Google and comes back signed in. */
export function GoogleButton({ from, getRegistration }: GoogleButtonProps) {
  const { t } = useTranslation()
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isSignUp = getRegistration !== undefined

  const handleClick = async () => {
    setErrorMessage(null)
    setIsPending(true)
    const registration = getRegistration ? await getRegistration() : undefined
    if (registration === null) {
      // The form shows what is missing.
      setIsPending(false)
      return
    }
    const { error } = await authClient.signIn.social({
      provider: "google",
      // The sign-in page sends on to where the visitor was going, or to an
      // unfinished onboarding first.
      callbackURL: addressOf(ROUTES.login, from),
      newUserCallbackURL: addressOf(ROUTES.onboarding, from),
      errorCallbackURL: addressOf(isSignUp ? ROUTES.signup : ROUTES.login, from),
      ...(registration ? { requestSignUp: true, additionalData: registration } : {}),
    })
    // On success the browser is already on its way to Google.
    if (error) {
      setErrorMessage(
        authErrorMessage(t, new AuthError(error.code, error.message, error.status), "googleFailed"),
      )
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-3">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <GoogleLogo />}
        {t("auth.google.button")}
      </Button>
    </div>
  )
}

/** The "or" between Google and the form. */
export function OrDivider() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3 typo-small text-muted-foreground">
      <span
        className="h-px flex-1 bg-border"
        aria-hidden
      />
      {t("auth.google.divider")}
      <span
        className="h-px flex-1 bg-border"
        aria-hidden
      />
    </div>
  )
}
