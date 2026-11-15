import { useId, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { administratorsQueryOptions } from "@/features/admin/api/adminQueryOptions"
import { ReportRefusedError } from "@/features/admin/api/reportMutations"
import {
  REPORT_RESOLUTION_NOTE_MAX_LENGTH,
  REPORT_RESOLUTION_NOTE_MIN_LENGTH,
} from "@/features/admin/api/reportSchemas"

/** Why a step failed, in words the administrator can act on. */
export const reportStepErrorOf = (t: TFunction, error: unknown): string | null => {
  if (!error) return null
  if (error instanceof ReportRefusedError) {
    return t(`admin.reports.refused.${error.violations[0] ?? "CHANGED"}`)
  }
  return t("admin.reports.stepFailed")
}

type StepSheetProps<TValues> = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  isPending: boolean
  error: unknown
  onSubmit: (values: TValues) => Promise<unknown>
}

const createAssignSchema = (t: TFunction) =>
  z.object({ administratorId: z.string().min(1, t("admin.reports.assign.pickRequired")) })

/**
 * #240, #73: hands the report to an active colleague. The one who has it now
 * is left out; to take it over oneself there is the button on the page.
 */
export function AssignReportSheet({
  isOpen,
  onOpenChange,
  isPending,
  error,
  onSubmit,
  excludeIds,
}: StepSheetProps<{ administratorId: string }> & { excludeIds: string[] }) {
  const { t } = useTranslation()
  const formId = useId()
  const schema = useMemo(() => createAssignSchema(t), [t])
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { administratorId: "" },
  })
  const administrators = useQuery({ ...administratorsQueryOptions(), enabled: isOpen })
  const colleagues = (administrators.data ?? []).filter(
    (administrator) => administrator.status === "ACTIVE" && !excludeIds.includes(administrator.id),
  )
  const errorMessage = reportStepErrorOf(t, error)

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={(isOpening) => {
        if (!isOpening) form.reset()
        onOpenChange(isOpening)
      }}
      title={t("admin.reports.assign.title")}
      description={t("admin.reports.assign.description")}
      hasCloseButton
      footer={
        <Button
          type="submit"
          form={formId}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("admin.reports.assign.submit")}
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
        // One pick in a sheet the administrator opened on purpose.
        isGuarded={false}
        className="flex flex-col gap-4 pb-1"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        {administrators.isError ? (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center gap-3">
              {t("admin.loadFailed")}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 md:h-9"
                onClick={() => void administrators.refetch()}
              >
                {t("admin.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        <FormField
          control={form.control}
          name="administratorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("admin.reports.assign.administrator")}</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={administrators.isPending || isPending}
              >
                <FormControl>
                  <SelectTrigger
                    ref={field.ref}
                    className="w-full"
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder={t("admin.reports.assign.placeholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {colleagues.map((administrator) => (
                    <SelectItem
                      key={administrator.id}
                      value={administrator.id}
                    >
                      {`${administrator.name} (${administrator.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {administrators.data && colleagues.length === 0 ? (
                <p className="typo-small text-muted-foreground">
                  {t("admin.reports.assign.noColleagues")}
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
      </AppForm>
    </ResponsiveSheet>
  )
}

const createResolveSchema = (t: TFunction) =>
  z.object({
    note: z
      .string()
      .trim()
      .min(REPORT_RESOLUTION_NOTE_MIN_LENGTH, t("admin.reports.resolve.noteTooShort"))
      .max(REPORT_RESOLUTION_NOTE_MAX_LENGTH, t("admin.reports.resolve.noteTooLong")),
  })

/**
 * #240, #73: resolves the report with a note only administrators read. The
 * reporter learns that it was dealt with, the first time only, never how.
 */
export function ResolveReportSheet({
  isOpen,
  onOpenChange,
  isPending,
  error,
  onSubmit,
}: StepSheetProps<{ note: string }>) {
  const { t } = useTranslation()
  const formId = useId()
  const schema = useMemo(() => createResolveSchema(t), [t])
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { note: "" },
  })
  const errorMessage = reportStepErrorOf(t, error)

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={(isOpening) => {
        if (!isOpening) form.reset()
        onOpenChange(isOpening)
      }}
      title={t("admin.reports.resolve.title")}
      description={t("admin.reports.resolve.description")}
      hasCloseButton
      footer={
        <Button
          type="submit"
          form={formId}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("admin.reports.resolve.submit")}
        </Button>
      }
    >
      <AppForm
        id={formId}
        form={form}
        onSubmit={async (values) => {
          await onSubmit({ note: values.note.trim() })
          form.reset()
        }}
        className="flex flex-col gap-4 pb-1"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("admin.reports.resolve.note")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  maxLength={REPORT_RESOLUTION_NOTE_MAX_LENGTH}
                  placeholder={t("admin.reports.resolve.notePlaceholder")}
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
