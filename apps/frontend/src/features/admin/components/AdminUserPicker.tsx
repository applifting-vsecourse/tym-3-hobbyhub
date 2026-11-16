import { useEffect, useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { UserIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ComboboxTrigger } from "@/components/hobbyhub/ComboboxTrigger"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { adminUsersQueryOptions } from "@/features/admin/api/adminQueryOptions"
import type { AdminUser } from "@/features/admin/api/adminSchemas"

// Typing waits this long before it asks, so a name is not searched letter by letter.
const TYPING_PAUSE_MS = 300

type AdminUserPickerProps = {
  /** The picked person, or null while none is. */
  value: Pick<AdminUser, "id" | "name" | "email"> | null
  onSelect: (user: AdminUser) => void
  /** Left out of the suggestions: the person whose detail this is. */
  excludeId: string
  id?: string
  isDisabled?: boolean
  // Passed on by the form's FormControl, so the label and the message tie to the trigger.
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

/**
 * #239: finds an account by name or e-mail, the same search as the user
 * list of the administration, and hands back the picked one.
 */
export function AdminUserPicker({
  value,
  onSelect,
  excludeId,
  id,
  isDisabled = false,
  "aria-invalid": isInvalid,
  "aria-describedby": describedBy,
}: AdminUserPickerProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState("")
  const [asked, setAsked] = useState("")
  const listId = useId()

  useEffect(() => {
    const timer = setTimeout(() => setAsked(text.trim()), TYPING_PAUSE_MS)
    return () => clearTimeout(timer)
  }, [text])

  const users = useQuery({ ...adminUsersQueryOptions(asked, 0), enabled: asked !== "" })
  const isCurrent = asked === text.trim()
  const suggestions = (users.data?.items ?? []).filter((user) => user.id !== excludeId)

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger asChild>
        <ComboboxTrigger
          id={id}
          isOpen={isOpen}
          listId={listId}
          isEmpty={!value}
          aria-invalid={isInvalid}
          aria-describedby={describedBy}
          disabled={isDisabled}
        >
          <UserIcon
            aria-hidden
            className="size-4 shrink-0"
          />
          <span className="truncate">
            {value ? `${value.name} (${value.email})` : t("admin.blocks.pickPlaceholder")}
          </span>
        </ComboboxTrigger>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        {/* The server searches and orders, so cmdk must not filter or re-sort. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={text}
            onValueChange={setText}
            placeholder={t("admin.blocks.pickSearch")}
          />
          <CommandList id={listId}>
            {text.trim() === "" ? (
              <p className="py-6 text-center typo-small text-muted-foreground">
                {t("admin.blocks.pickHint")}
              </p>
            ) : users.isError && isCurrent ? (
              <p
                role="alert"
                className="py-6 text-center typo-small text-destructive"
              >
                {t("admin.blocks.pickError")}
              </p>
            ) : !isCurrent || users.isFetching ? (
              <p
                role="status"
                className="py-6 text-center typo-small text-muted-foreground"
              >
                {t("admin.loading")}
              </p>
            ) : (
              <>
                <CommandEmpty>{t("admin.blocks.pickNoMatch")}</CommandEmpty>
                <CommandGroup>
                  {suggestions.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      onSelect={() => {
                        onSelect(user)
                        setIsOpen(false)
                      }}
                    >
                      <UserIcon aria-hidden />
                      <span className="truncate">{`${user.name} (${user.email})`}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
