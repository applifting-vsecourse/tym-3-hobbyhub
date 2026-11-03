import { useId, useMemo } from "react"
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

import {
  MEMBERSHIP_REJECTION_REASON_MAX,
  type PendingMembershipRequest,
} from "@/features/group/api/membershipRequestSchemas"

// Characters as the server and the database count them (code points).
const charCount = (value: string) => [...value].length

const createSchema = (t: TFunction) =>
  z.object({
    reason: z
      .string()
      .trim()
      .refine((reason) => charCount(reason) <= MEMBERSHIP_REJECTION_REASON_MAX, {
        message: t("groups.manage.reject.reasonTooLong", {
          count: MEMBERSHIP_REJECTION_REASON_MAX,
        }),
      }),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type RejectFormProps = {
  formId: string
  applicantName: string
  isPending: boolean
  onSubmit: (reason: string | undefined) => Promise<void>
}

function RejectForm({ formId, applicantName, isPending, onSubmit }: RejectFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  })

  return (
    <AppForm
      id={formId}
      form={form}
      onSubmit={(values) => onSubmit(values.reason || undefined)}
      className="flex flex-col gap-4 pb-1"
    >
      <p className="typo-body text-foreground">
        {t("groups.manage.reject.text", { name: applicantName })}
      </p>
      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("groups.manage.reject.reasonLabel")}</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder={t("groups.manage.reject.reasonPlaceholder")}
                disabled={isPending}
                {...field}
              />
            </FormControl>
            <FormDescription>{t("groups.manage.reject.reasonHint")}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </AppForm>
  )
}

type RejectMembershipRequestSheetProps = {
  /** The request to reject; null when the sheet is closed. */
  request: PendingMembershipRequest | null
  isPending: boolean
  onClose: () => void
  /** Rejects with the optional reason; the sheet closes once it resolves. */
  onReject: (request: PendingMembershipRequest, reason: string | undefined) => Promise<void>
}

/** Zamítnutí žádosti o členství (F-07.3): final for the group (ADR-0014), with an optional reason. */
export function RejectMembershipRequestSheet({
  request,
  isPending,
  onClose,
  onReject,
}: RejectMembershipRequestSheetProps) {
  const { t } = useTranslation()
  const formId = useId()

  return (
    <ResponsiveSheet
      isOpen={request !== null}
      onOpenChange={(isOpening) => {
        if (!isOpening) onClose()
      }}
      title={t("groups.manage.reject.title")}
      hasCloseButton
      isFooterScrolling
      footer={
        <>
          <Button
            type="submit"
            form={formId}
            variant="destructive"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("groups.manage.reject.confirm")}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
          >
            {t("groups.manage.reject.cancel")}
          </Button>
        </>
      }
    >
      {request ? (
        <RejectForm
          // A new request starts with an empty reason.
          key={request.id}
          formId={formId}
          applicantName={request.applicant.name}
          isPending={isPending}
          onSubmit={(reason) => onReject(request, reason)}
        />
      ) : null}
    </ResponsiveSheet>
  )
}
