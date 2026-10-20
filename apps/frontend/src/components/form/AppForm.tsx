import type { ComponentProps } from "react"
import {
  FormProvider,
  type FieldValues,
  type SubmitErrorHandler,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form"

import { UnsavedChangesGuard } from "@/components/form/UnsavedChangesGuard"

type AppFormProps<TFieldValues extends FieldValues> = Omit<ComponentProps<"form">, "onSubmit"> & {
  readonly form: UseFormReturn<TFieldValues>
  /**
   * Runs with valid values. Let a failed save throw (or reject): the form then
   * records the submit as unsuccessful and the guard stays armed. Report the
   * failure to the user yourself, e.g. from the mutation state.
   */
  readonly onSubmit: SubmitHandler<TFieldValues>
  readonly onInvalid?: SubmitErrorHandler<TFieldValues>
  /**
   * Runs before validation. Return `true` to take the submit over, e.g. a
   * wizard that moves to its next step on Enter instead of submitting.
   */
  readonly onBeforeSubmit?: () => boolean
  /**
   * Ask before leaving the page with changes that were not submitted. Off only
   * where half-typed input costs nothing: sign-in, a one-line post.
   */
  readonly isGuarded?: boolean
  readonly guardMessage?: string
}

/**
 * The one way to build a form: the react-hook-form provider, the `<form>`
 * element (no native validation; the schema does it) and the unsaved-changes
 * guard in one. Fields inside use `FormField`, `FormItem`… from the kit.
 */
export function AppForm<TFieldValues extends FieldValues>({
  form,
  onSubmit,
  onInvalid,
  onBeforeSubmit,
  isGuarded = true,
  guardMessage,
  children,
  ...formProps
}: AppFormProps<TFieldValues>) {
  const submit = form.handleSubmit(onSubmit, onInvalid)

  return (
    <FormProvider {...form}>
      <form
        noValidate
        {...formProps}
        onSubmit={(event) => {
          if (onBeforeSubmit?.()) {
            event.preventDefault()
            return
          }
          // The handler reports its own failures (field errors, mutation state).
          // The rejection only exists so react-hook-form knows the submit did
          // not succeed; nothing else is waiting for it.
          void submit(event).catch(() => undefined)
        }}
      >
        {children}
        {isGuarded ? <UnsavedChangesGuard message={guardMessage} /> : null}
      </form>
    </FormProvider>
  )
}
