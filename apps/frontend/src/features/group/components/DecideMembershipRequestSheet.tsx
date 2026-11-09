import { useId, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

import type { MembershipDecisionKind } from "@/features/group/api/membershipRequestMutations"
import {
  MEMBERSHIP_DECISION_MESSAGE_MAX,
  type PendingMembershipRequest,
} from "@/features/group/api/membershipRequestSchemas"

// Characters as the server and the database count them (code points).
const charCount = (value: string) => [...value].length

const createSchema = (t: TFunction) =>
  z.object({
    message: z
      .string()
      .trim()
      .refine((message) => charCount(message) <= MEMBERSHIP_DECISION_MESSAGE_MAX, {
        message: t("groups.manage.decision.messageTooLong", {
          count: MEMBERSHIP_DECISION_MESSAGE_MAX,
        }),
      }),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type DecideFormProps = {
  formId: string
  decision: MembershipDecisionKind
  applicantName: string
  isPending: boolean
  onSubmit: (message: string | undefined) => Promise<void>
}

function DecideForm({ formId, decision, applicantName, isPending, onSubmit }: DecideFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: "" },
  })

  return (
    <AppForm
      id={formId}
      form={form}
      onSubmit={(values) => onSubmit(values.message || undefined)}
      className="flex flex-col gap-4 pb-1"
    >
      <p className="typo-body text-foreground">
        {t(`groups.manage.${decision}.text`, { name: applicantName })}
      </p>
      <FormField
        control={form.control}
        name="message"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("groups.manage.decision.messageLabel")}</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder={t(`groups.manage.${decision}.messagePlaceholder`)}
                disabled={isPending}
                {...field}
              />
            </FormControl>
            <FormDescription>{t("groups.manage.decision.messageHint")}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </AppForm>
  )
}

type DecideMembershipRequestSheetProps = {
  /** The request to decide and how; null when the sheet is closed. */
  deciding: { request: PendingMembershipRequest; decision: MembershipDecisionKind } | null
  isPending: boolean
  onClose: () => void
  /** Decides with the optional message; the sheet closes once it resolves. */
  onDecide: (message: string | undefined) => Promise<void>
}

/**
 * Schválení nebo zamítnutí žádosti o členství (F-07.3, #153), with an optional
 * message for the applicant. A rejection is final for the group (ADR-0014).
 */
export function DecideMembershipRequestSheet({
  deciding,
  isPending,
  onClose,
  onDecide,
}: DecideMembershipRequestSheetProps) {
  const { t } = useTranslation()
  const formId = useId()
  // While the sheet animates out, it keeps showing the request it closed on.
  const [shown, setShown] = useState(deciding)
  if (deciding !== null && deciding !== shown) setShown(deciding)
  const decision = shown?.decision ?? "reject"

  return (
    <ResponsiveSheet
      isOpen={deciding !== null}
      onOpenChange={(isOpening) => {
        if (!isOpening) onClose()
      }}
      title={t(`groups.manage.${decision}.title`)}
      hasCloseButton
      isFooterScrolling
      footer={
        <>
          <Button
            type="submit"
            form={formId}
            variant={decision === "reject" ? "destructive" : "default"}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t(`groups.manage.${decision}.confirm`)}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
          >
            {t(`groups.manage.${decision}.cancel`)}
          </Button>
        </>
      }
    >
      {shown ? (
        <DecideForm
          // A new request or decision starts with an empty message.
          key={`${shown.request.id}-${shown.decision}`}
          formId={formId}
          decision={shown.decision}
          applicantName={shown.request.applicant.name}
          isPending={isPending}
          onSubmit={onDecide}
        />
      ) : null}
    </ResponsiveSheet>
  )
}
