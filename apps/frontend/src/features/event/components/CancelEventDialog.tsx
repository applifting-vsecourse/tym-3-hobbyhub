import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import {
  CANCELLATION_NOTE_MAX,
  type CancelEventInput,
  type CancellationReason,
} from "@/features/event/api/eventSchemas"

const createSchema = (t: TFunction) =>
  z.object({
    cancellationReasonId: z.string().min(1, t("events.cancel.reasonRequired")),
    cancellationNote: z
      .string()
      .trim()
      .refine(
        (value) => [...value].length <= CANCELLATION_NOTE_MAX,
        t("events.validation.tooLong", { count: CANCELLATION_NOTE_MAX }),
      ),
  })

type FormValues = z.input<ReturnType<typeof createSchema>>

type CancelEventDialogProps = {
  readonly isOpen: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly reasons: CancellationReason[]
  readonly isReasonsLoading: boolean
  readonly isSubmitting: boolean
  readonly errorMessage?: string | null
  readonly onSubmit: (values: CancelEventInput) => void | Promise<void>
}

/** Asks the organizer for the reason before an event is cancelled (F-05.10). */
export function CancelEventDialog({
  isOpen,
  onOpenChange,
  reasons,
  isReasonsLoading,
  isSubmitting,
  errorMessage,
  onSubmit,
}: CancelEventDialogProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cancellationReasonId: "", cancellationNote: "" },
  })

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        {/* Nothing typed here is worth a leave-the-page prompt. */}
        <AppForm
          form={form}
          isGuarded={false}
          className="space-y-4"
          onSubmit={(values) =>
            onSubmit({
              cancellationReasonId: values.cancellationReasonId,
              cancellationNote: values.cancellationNote.trim() || undefined,
            })
          }
        >
          <DialogHeader>
            <DialogTitle>{t("events.cancel.title")}</DialogTitle>
            <DialogDescription>{t("events.cancel.description")}</DialogDescription>
          </DialogHeader>
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
          <FormField
            control={form.control}
            name="cancellationReasonId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("events.cancel.reason")}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isReasonsLoading}
                >
                  <FormControl>
                    <SelectTrigger
                      ref={field.ref}
                      className="w-full"
                      onBlur={field.onBlur}
                    >
                      <SelectValue placeholder={t("events.cancel.reasonPlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {reasons.map((reason) => (
                      <SelectItem
                        key={reason.id}
                        value={reason.id}
                      >
                        {reason.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cancellationNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("events.cancel.note")}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder={t("events.cancel.notePlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("events.cancel.back")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("events.cancel.submit")}
            </Button>
          </DialogFooter>
        </AppForm>
      </DialogContent>
    </Dialog>
  )
}
