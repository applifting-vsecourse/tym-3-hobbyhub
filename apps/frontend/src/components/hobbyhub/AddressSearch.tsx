import { useEffect, useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { MapPinIcon } from "lucide-react"
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
import {
  addressSuggestionsQueryOptions,
  MIN_ADDRESS_QUERY_LENGTH,
  type AddressSuggestion,
  type AddressSuggestionItem,
} from "@/lib/addressSuggestions"

// Typing waits this long before it asks, so an address is not searched letter by letter.
const TYPING_PAUSE_MS = 300

// The address as the forms store it, without the geocoder's marker of a whole street.
const toAddress = ({
  label,
  street,
  city,
  postalCode,
  country,
  latitude,
  longitude,
}: AddressSuggestionItem): AddressSuggestion => ({
  label,
  street,
  city,
  postalCode,
  country,
  latitude,
  longitude,
})

type AddressSearchProps = {
  /** The line of the address that was picked, or "" while none is. */
  value: string
  onSelect: (address: AddressSuggestion) => void
  /** Shown on the trigger while nothing is picked. */
  placeholder: string
  /** A street without a house number can be picked as it is (a home address). */
  isStreetAllowed?: boolean
  /**
   * What happens to a street picked without a house number when it is not
   * allowed as it is. Without it such streets are not suggested at all.
   */
  onSelectStreet?: (street: AddressSuggestion) => void
  /** Called as the list closes after a street was picked, to take over the focus. */
  onCloseAutoFocus?: (event: Event) => void
  className?: string
  id?: string
}

/**
 * Hledání adresy — a combobox that suggests real addresses as you type and
 * hands back the picked one with its position. The trigger looks like a
 * select; the suggestions come from the geocoder, not from a loaded list.
 */
export function AddressSearch({
  value,
  onSelect,
  placeholder,
  isStreetAllowed = false,
  onSelectStreet,
  onCloseAutoFocus,
  className,
  id,
}: AddressSearchProps) {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState("")
  const [asked, setAsked] = useState("")
  const listId = useId()

  useEffect(() => {
    const timer = setTimeout(() => setAsked(text.trim()), TYPING_PAUSE_MS)
    return () => clearTimeout(timer)
  }, [text])

  const suggestions = useQuery(addressSuggestionsQueryOptions(asked, i18n.language))
  const isTooShort = text.trim().length < MIN_ADDRESS_QUERY_LENGTH
  // The previous text's suggestions are not offered for the new text.
  const isCurrent = asked === text.trim()
  const canPickStreet = isStreetAllowed || onSelectStreet !== undefined
  const shown = (suggestions.data ?? []).filter(
    (suggestion) => canPickStreet || !suggestion.isStreet,
  )

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
          className={className}
        >
          <MapPinIcon
            aria-hidden
            className="size-4 shrink-0"
          />
          <span className="truncate">{value || placeholder}</span>
        </ComboboxTrigger>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        onCloseAutoFocus={onCloseAutoFocus}
        className="w-(--radix-popover-trigger-width) p-0"
      >
        {/* The geocoder ranks the suggestions, so cmdk must not filter or re-sort them. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={text}
            onValueChange={setText}
            placeholder={t("geo.address.search")}
          />
          <CommandList id={listId}>
            {isTooShort ? (
              <p className="py-6 text-center typo-small text-muted-foreground">
                {t("geo.address.minLength", { count: MIN_ADDRESS_QUERY_LENGTH })}
              </p>
            ) : suggestions.isError && isCurrent ? (
              <p
                role="alert"
                className="py-6 text-center typo-small text-destructive"
              >
                {t("geo.address.error")}
              </p>
            ) : !isCurrent || suggestions.isFetching ? (
              <p
                role="status"
                className="py-6 text-center typo-small text-muted-foreground"
              >
                {t("geo.address.loading")}
              </p>
            ) : (
              <>
                <CommandEmpty>{t("geo.address.noMatch")}</CommandEmpty>
                <CommandGroup>
                  {shown.map((suggestion) => (
                    <CommandItem
                      key={`${suggestion.isStreet}:${suggestion.label}:${suggestion.latitude}:${suggestion.longitude}`}
                      value={suggestion.label}
                      onSelect={() => {
                        if (suggestion.isStreet && !isStreetAllowed) {
                          onSelectStreet?.(toAddress(suggestion))
                        } else {
                          onSelect(toAddress(suggestion))
                        }
                        setIsOpen(false)
                      }}
                    >
                      <MapPinIcon aria-hidden />
                      {suggestion.label}
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
