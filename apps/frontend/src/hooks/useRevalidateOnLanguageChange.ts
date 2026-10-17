import { useEffect } from "react"
import type { FieldValues, Path, UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

/**
 * Validation messages are baked into the schema, so errors already on screen
 * keep the old language. Re-validate just those fields when it changes.
 */
export function useRevalidateOnLanguageChange<T extends FieldValues>(form: UseFormReturn<T>) {
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage

  useEffect(() => {
    const fields = Object.keys(form.formState.errors) as Path<T>[]
    if (fields.length > 0) void form.trigger(fields)
  }, [form, language])
}
