import { useId, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { AdministratorRefusedError } from "@/features/admin/api/administratorMutations"
import { ADMINISTRATOR_NAME_MAX_LENGTH } from "@/features/admin/api/adminSchemas"

const createSchema = (t: TFunction) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, t("admin.invite.emailRequired"))
      .pipe(z.email(t("admin.invite.emailInvalid"))),
    name: z
      .string()
      .trim()
      .min(1, t("admin.invite.nameRequired"))
      .max(ADMINISTRATOR_NAME_MAX_LENGTH, t("admin.invite.nameTooLong")),
  })

export type InviteAdministratorValues = z.infer<ReturnType<typeof createSchema>>

type InviteAdministratorSheetProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  isPending: boolean
  error: unknown
  onSubmit: (values: InviteAdministratorValues) => Promise<unknown>
}

/** What went wrong, in words: a taken address says what to do instead. */
const errorMessageOf = (t: TFunction, error: unknown): string | null => {
  if (!error) return null
  if (error instanceof AdministratorRefusedError) {
    if (error.violations.includes("DEACTIVATED_ADMINISTRATOR")) {
      return t("admin.invite.deactivated")
    }
    if (error.violations.includes("ALREADY_ADMINISTRATOR")) return t("admin.invite.taken")
  }
  return t("admin.invite.failed")
}

/** #237: invites a colleague; they set their own password from the e-mail. */
export function InviteAdministratorSheet({
  isOpen,
  onOpenChange,
  isPending,
  error,
  onSubmit,
}: InviteAdministratorSheetProps) {
  const { t } = useTranslation()
  const formId = useId()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<InviteAdministratorValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", name: "" },
  })
  const errorMessage = errorMessageOf(t, error)

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={(isOpening) => {
        if (!isOpening) form.reset()
        onOpenChange(isOpening)
      }}
      title={t("admin.invite.title")}
      description={t("admin.invite.description")}
      hasCloseButton
      footer={
        <Button
          type="submit"
          form={formId}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("admin.invite.submit")}
        </Button>
      }
    >
      <AppForm
        id={formId}
        form={form}
        onSubmit={async (values) => {
          await onSubmit(values)
          form.reset()
        }}
        // Two short fields; nothing worth a "leave the page?" question.
        isGuarded={false}
        className="flex flex-col gap-4 pb-1"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("admin.invite.email")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="off"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("admin.invite.name")}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </AppForm>
    </ResponsiveSheet>
  )
}
