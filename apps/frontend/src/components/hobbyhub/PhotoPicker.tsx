import { useId, useRef } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PhotoPickerProps = {
  label?: string
  hint?: string
  /** URL of the chosen photo (object URL or uploaded image). */
  value?: string
  onFileSelect: (file: File) => void
  className?: string
}

/** Fotka nebo ilustrace — optional event photo upload field. */
export function PhotoPicker({
  label = "Fotka nebo ilustrace (nepovinné)",
  hint = "nebo vyberte ilustraci aktivity",
  value,
  onFileSelect,
  className,
}: PhotoPickerProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="typo-label-lg text-foreground"
      >
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFileSelect(file)
        }}
      />
      <div
        className={cn(
          "flex items-center gap-3 rounded-md border p-3",
          value ? "border-border bg-card" : "border-dashed border-input bg-secondary",
        )}
      >
        {value ? (
          <img
            src={value}
            alt="Vybraná fotka akce"
            className="size-18 rounded-md object-cover"
          />
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          {value ? "Změnit fotku" : "Nahrát fotku"}
        </Button>
        {value ? null : <p className="flex-1 typo-small text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}
