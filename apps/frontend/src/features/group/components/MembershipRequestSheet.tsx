import { useEffect, useId, useMemo, useState, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { ActivityAvatar } from "@/components/hobbyhub/ActivityAvatar"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

import { MembershipRefusedError } from "@/features/group/api/membershipRequestMutations"
import { MEMBERSHIP_REQUEST_MESSAGE_MAX } from "@/features/group/api/membershipRequestSchemas"
import {
  useRequestMembership,
  useWithdrawMembershipRequest,
} from "@/features/group/hooks/useMembershipRequestMutations"

/** `form` asks, `sent` confirms a request waiting for the admins, `withdraw` confirms taking it back. */
export type MembershipSheetStep = "form" | "sent" | "withdraw"

/** What the group's admins learn about the applicant. */
export type MembershipApplicant = {
  name: string
  isEmailVerified: boolean
}

// Characters as the server and the database count them: code points, so an
// emoji is one, and a line break is one too. `trim()` is the server's as well.
const charCount = (value: string) => [...value].length

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z.object({
    message: z
      .string()
      .trim()
      .refine((message) => charCount(message) <= MEMBERSHIP_REQUEST_MESSAGE_MAX, {
        message: t("groups.membershipRequest.form.messageTooLong", {
          count: MEMBERSHIP_REQUEST_MESSAGE_MAX,
        }),
      }),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type RequestFormProps = {
  formId: string
  applicant: MembershipApplicant
  isPending: boolean
  errorMessage: string | null
  onSubmit: (message: string | undefined) => Promise<void>
}

function RequestForm({ formId, applicant, isPending, errorMessage, onSubmit }: RequestFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: "" },
  })

  return (
    <div className="flex flex-col gap-4 pb-1">
      <section className="flex flex-col gap-3 rounded-lg bg-muted p-4">
        <h3 className="typo-small text-muted-foreground">
          {t("groups.membershipRequest.form.adminSees")}
        </h3>
        <div className="flex items-center gap-3">
          <ActivityAvatar
            avatar="open"
            size="md"
          />
          <div className="flex min-w-0 flex-col">
            <p className="typo-title text-foreground">{applicant.name}</p>
            <p className="typo-small text-muted-foreground">
              {t(
                applicant.isEmailVerified
                  ? "groups.membershipRequest.form.profileVerified"
                  : "groups.membershipRequest.form.profileBasic",
              )}
            </p>
          </div>
        </div>
        <p className="typo-small text-muted-foreground">
          {t("groups.membershipRequest.form.hiddenDetails")}
        </p>
      </section>

      <AppForm
        id={formId}
        form={form}
        onSubmit={(values) => onSubmit(values.message || undefined)}
        className="flex flex-col gap-3"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("groups.membershipRequest.form.messageLabel")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder={t("groups.membershipRequest.form.messagePlaceholder")}
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </AppForm>
    </div>
  )
}

type MembershipRequestSheetProps = {
  groupId: string
  applicant: MembershipApplicant
  /** Which step is open; null when the sheet is closed. */
  step: MembershipSheetStep | null
  onStepChange: (step: MembershipSheetStep | null) => void
}

/**
 * Žádost o členství (F-07.3): ask with an optional message, see it sent, and
 * confirm withdrawing it. The page owns the sheet, so it stays open while the
 * membership panel under it switches to the pending request.
 */
export function MembershipRequestSheet({
  groupId,
  applicant,
  step,
  onStepChange,
}: MembershipRequestSheetProps) {
  const { t } = useTranslation()
  const formId = useId()
  const requestMembership = useRequestMembership()
  const withdraw = useWithdrawMembershipRequest()
  // While the sheet animates out, it keeps showing the step it closed on.
  const [shownStep, setShownStep] = useState<MembershipSheetStep>(step ?? "form")
  if (step !== null && step !== shownStep) setShownStep(step)

  // A new attempt starts without the error of the last one.
  const { reset: resetRequest } = requestMembership
  useEffect(() => {
    if (step === "form") resetRequest()
  }, [step, resetRequest])

  const close = () => onStepChange(null)

  const send = async (message: string | undefined) => {
    await requestMembership.mutateAsync({ groupId, message })
    onStepChange("sent")
  }

  const confirmWithdraw = async () => {
    try {
      await withdraw.mutateAsync(groupId)
      close()
      toast.success(t("groups.membershipRequest.withdraw.done"))
    } catch {
      toast.error(t("groups.membershipRequest.withdraw.failed"))
    }
  }

  const { error } = requestMembership
  const refusal =
    error instanceof MembershipRefusedError
      ? error.violations.find(
          (violation) =>
            violation === "IS_MEMBER" ||
            violation === "ALREADY_REQUESTED" ||
            violation === "REJECTED_BEFORE",
        )
      : undefined
  const errorMessage = error
    ? refusal
      ? t(`groups.membershipRequest.refused.${refusal}`)
      : t("groups.membershipRequest.form.sendFailed")
    : null

  const steps: Record<MembershipSheetStep, { title: string; body: ReactNode; footer: ReactNode }> =
    {
      form: {
        title: t("groups.membershipRequest.form.title"),
        body: (
          <RequestForm
            formId={formId}
            applicant={applicant}
            isPending={requestMembership.isPending}
            errorMessage={errorMessage}
            onSubmit={send}
          />
        ),
        footer: (
          <>
            <Button
              type="submit"
              form={formId}
              disabled={requestMembership.isPending}
            >
              {requestMembership.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("groups.membershipRequest.form.submit")}
            </Button>
            <Button
              variant="ghost"
              onClick={close}
            >
              {t("groups.membershipRequest.form.cancel")}
            </Button>
          </>
        ),
      },
      sent: {
        title: t("groups.membershipRequest.sent.title"),
        body: (
          <div className="flex flex-col items-start gap-3 pb-1">
            <StatusBadge status="pending" />
            <p className="typo-body text-muted-foreground">
              {t("groups.membershipRequest.sent.text")}
            </p>
          </div>
        ),
        footer: (
          <>
            <Button onClick={close}>{t("groups.membershipRequest.sent.close")}</Button>
            <Button
              variant="ghost"
              onClick={() => onStepChange("withdraw")}
            >
              {t("groups.membershipRequest.sent.withdraw")}
            </Button>
          </>
        ),
      },
      withdraw: {
        title: t("groups.membershipRequest.withdraw.title"),
        body: (
          <p className="mb-1 rounded-lg bg-muted p-4 typo-body text-foreground">
            {t("groups.membershipRequest.withdraw.text")}
          </p>
        ),
        footer: (
          <>
            <Button onClick={close}>{t("groups.membershipRequest.withdraw.keep")}</Button>
            <Button
              variant="outline"
              disabled={withdraw.isPending}
              onClick={() => void confirmWithdraw()}
            >
              {withdraw.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("groups.membershipRequest.withdraw.confirm")}
            </Button>
          </>
        ),
      },
    }
  const shown = steps[shownStep]

  return (
    <ResponsiveSheet
      isOpen={step !== null}
      onOpenChange={(isOpening) => {
        if (!isOpening) close()
      }}
      title={shown.title}
      footer={shown.footer}
      hasCloseButton
      // The form has the message field; its buttons must not cover it.
      isFooterScrolling={shownStep === "form"}
    >
      {shown.body}
    </ResponsiveSheet>
  )
}
