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
import { Textarea } from "@/components/ui/textarea"

import {
  USER_BLOCK_REASON_MAX_LENGTH,
  USER_BLOCK_REASON_MIN_LENGTH,
} from "@/features/admin/api/adminSchemas"
import { UserBlockRefusedError } from "@/features/admin/api/userBlockMutations"
import { AdminUserPicker } from "@/features/admin/components/AdminUserPicker"

const createSchema = (t: TFunction) =>
  z.object({
    otherUser: z
      .object({ id: z.string(), name: z.string(), email: z.string() })
      .nullable()
      .refine((user) => user !== null, t("admin.blocks.pickRequired")),
    reason: z
      .string()
      .trim()
      .min(USER_BLOCK_REASON_MIN_LENGTH, t("admin.blocks.reasonTooShort"))
      .max(USER_BLOCK_REASON_MAX_LENGTH, t("admin.blocks.reasonTooLong")),
  })

type BlockUserFormValues = z.input<ReturnType<typeof createSchema>>

export type BlockUserValues = { otherUserId: string; reason: string }

type BlockUserSheetProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  /** The person whose detail this is. */
  user: { id: string; name: string }
  isPending: boolean
  error: unknown
  onSubmit: (values: BlockUserValues) => Promise<unknown>
}

const errorMessageOf = (t: TFunction, error: unknown): string | null => {
  if (!error) return null
  if (error instanceof UserBlockRefusedError && error.violations.includes("ALREADY_BLOCKED")) {
    return t("admin.blocks.alreadyBlocked")
  }
  return t("admin.blocks.failed")
}

/** #239: blocks the person and someone else from each other, with a reason only administrators read. */
export function BlockUserSheet({
  isOpen,
  onOpenChange,
  user,
  isPending,
  error,
  onSubmit,
}: BlockUserSheetProps) {
  const { t } = useTranslation()
  const formId = useId()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<BlockUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { otherUser: null, reason: "" },
  })
  const errorMessage = errorMessageOf(t, error)

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={(isOpening) => {
        if (!isOpening) form.reset()
        onOpenChange(isOpening)
      }}
      title={t("admin.blocks.blockTitle", { name: user.name })}
      description={t("admin.blocks.blockDescription")}
      hasCloseButton
      footer={
        <Button
          type="submit"
          form={formId}
          variant="destructive"
          disabled={isPending}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("admin.blocks.blockSubmit")}
        </Button>
      }
    >
      <AppForm
        id={formId}
        form={form}
        onSubmit={async (values) => {
          await onSubmit({
            otherUserId: values.otherUser?.id ?? "",
            reason: values.reason.trim(),
          })
          form.reset()
        }}
        // One pick and a sentence in a sheet the administrator opened on purpose.
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
          name="otherUser"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("admin.blocks.otherUser")}</FormLabel>
              <FormControl>
                <AdminUserPicker
                  value={field.value}
                  onSelect={(picked) => field.onChange(picked)}
                  excludeId={user.id}
                  isDisabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("admin.blocks.reasonLabel")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  maxLength={USER_BLOCK_REASON_MAX_LENGTH}
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
