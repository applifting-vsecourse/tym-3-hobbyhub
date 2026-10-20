import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { useAddQuack } from "@/features/quack/hooks/useAddQuack"

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
const MAX_LENGTH = 280

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z.object({
    text: z
      .string()
      .trim()
      .min(1, t("quacks.form.required"))
      .max(MAX_LENGTH, t("quacks.form.tooLong", { count: MAX_LENGTH })),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type QuackFormProps = { className?: string }

export function QuackForm({ className }: QuackFormProps) {
  const { t } = useTranslation()
  const addQuack = useAddQuack()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: "" },
  })

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0

  const handleSubmit = (values: FormValues) => {
    addQuack.mutate({ text: values.text }, { onSuccess: () => form.reset() })
  }

  return (
    <AppForm
      form={form}
      onSubmit={handleSubmit}
      // A one-line post costs nothing to retype.
      isGuarded={false}
      className={cn("space-y-3", className)}
    >
      {addQuack.error ? (
        <Alert variant="destructive">
          <AlertDescription>{addQuack.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <FormField
        control={form.control}
        name="text"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("quacks.form.label")}</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder={t("quacks.form.placeholder")}
                disabled={addQuack.isPending}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex items-center justify-end gap-3">
        <span
          className={cn(
            "text-sm",
            length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {length}/{MAX_LENGTH}
        </span>
        <Button
          type="submit"
          size="sm"
          disabled={addQuack.isPending}
        >
          {addQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("quacks.form.submit")}
        </Button>
      </div>
    </AppForm>
  )
}
