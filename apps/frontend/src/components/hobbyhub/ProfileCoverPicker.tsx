import { useId, useRef, useState } from "react"
import { Check, Pencil, Upload } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ProfileCover } from "@/components/hobbyhub/ProfileCover"
import {
  COVER_IDS,
  COVERS,
  defaultCoverId,
  isCoverId,
  isOwnCover,
} from "@/components/hobbyhub/profileCovers"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { COVER_MAX_SIDE_PX, PhotoError, toWebpDataUrl, type PhotoProblem } from "@/lib/webpImage"

/** What an uploaded cover may be: JPG, PNG or WebP of any size; it is shrunk to 2 MB. */
const COVER_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
const COVER_FILE_MAX_BYTES = 20 * 1024 * 1024

type ProfileCoverPickerProps = {
  /** The chosen cover: an id, the person's own picture as a data URL, or `null` for the default. */
  value: string | null
  /** Icon key of the first sport: what the profile wears while nothing is chosen. */
  firstActivityIcon: string | undefined
  onChange: (value: string | null) => void
  /**
   * Only the cover, as wide as on the profile, with a button over its corner:
   * for editing a profile in place.
   */
  isCompact?: boolean
  className?: string
}

/**
 * Výběr úvodní grafiky — a sheet (a drawer on phones, a dialog from `md`) of all
 * the app's covers to pick from, the way back to the default of the first sport,
 * or an upload of the person's own picture.
 */
export function ProfileCoverPicker({
  value,
  firstActivityIcon,
  onChange,
  isCompact = false,
  className,
}: ProfileCoverPickerProps) {
  const { t } = useTranslation()
  const labelId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [problem, setProblem] = useState<PhotoProblem | "type" | "size" | null>(null)
  const defaultCover = defaultCoverId(firstActivityIcon)
  const chosenId = value && isCoverId(value) ? value : null

  const choose = (next: string | null) => {
    onChange(next)
    setProblem(null)
    setIsOpen(false)
  }

  const chooseFile = async (file: File) => {
    if (!(COVER_FILE_TYPES as readonly string[]).includes(file.type)) return setProblem("type")
    if (file.size > COVER_FILE_MAX_BYTES) return setProblem("size")
    const url = URL.createObjectURL(file)
    setIsBusy(true)
    try {
      choose(await toWebpDataUrl(url, COVER_MAX_SIDE_PX))
    } catch (error) {
      setProblem(error instanceof PhotoError ? error.problem : "unreadable")
    } finally {
      setIsBusy(false)
      URL.revokeObjectURL(url)
    }
  }

  const sheet = (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      // The sheet's own trigger, so focus returns to it when the sheet closes.
      trigger={
        isCompact ? (
          <button
            type="button"
            aria-label={t("hobbyhub.profileCover.change")}
            className="group relative block w-full rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <ProfileCover
              cover={value}
              firstActivityIcon={firstActivityIcon}
            />
            <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-2 typo-label text-foreground max-md:min-h-11">
              <Pencil
                aria-hidden="true"
                className="size-4"
              />
              {t("hobbyhub.profileCover.change")}
            </span>
          </button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="max-md:h-11"
          >
            {t("hobbyhub.profileCover.change")}
          </Button>
        )
      }
      title={t("hobbyhub.profileCover.sheetTitle")}
      description={t("hobbyhub.profileCover.sheetDescription")}
      footer={
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="max-md:h-11"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" />
            {t("hobbyhub.profileCover.upload")}
          </Button>
          {problem ? (
            <p
              role="alert"
              className="typo-small text-destructive"
            >
              {t(`hobbyhub.profileCover.problem.${problem}`)}
            </p>
          ) : null}
        </div>
      }
    >
      <ul className="grid grid-cols-2 gap-3 pb-2 md:grid-cols-3">
        {isOwnCover(value) ? (
          <li>
            <CoverTile
              src={value}
              name={t("hobbyhub.profileCover.own")}
              isSelected
              onSelect={() => choose(value)}
            />
          </li>
        ) : null}
        <li>
          <CoverTile
            src={COVERS[defaultCover]}
            name={t("hobbyhub.profileCover.auto")}
            isSelected={value === null}
            onSelect={() => choose(null)}
          />
        </li>
        {COVER_IDS.map((id) => (
          <li key={id}>
            <CoverTile
              src={COVERS[id]}
              name={t(`hobbyhub.profileCover.names.${id}`)}
              isSelected={chosenId === id}
              onSelect={() => choose(id)}
            />
          </li>
        ))}
      </ul>
      <input
        ref={fileInputRef}
        type="file"
        accept={COVER_FILE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-label={t("hobbyhub.profileCover.upload")}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void chooseFile(file)
          // The same file can be chosen again after a refusal.
          event.target.value = ""
        }}
      />
    </ResponsiveSheet>
  )

  if (isCompact) return <div className={className}>{sheet}</div>

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p
        id={labelId}
        className="typo-label-lg text-foreground"
      >
        {t("hobbyhub.profileCover.label")}
      </p>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex flex-col gap-3"
      >
        <ProfileCover
          cover={value}
          firstActivityIcon={firstActivityIcon}
          className="h-24 md:h-28"
        />
        {sheet}
      </div>
    </div>
  )
}

type CoverTileProps = {
  src: string
  name: string
  isSelected: boolean
  onSelect: () => void
}

function CoverTile({ src, name, isSelected, onSelect }: CoverTileProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={cn(
        "relative flex w-full flex-col gap-1 rounded-lg border p-1.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring max-md:min-h-11",
        isSelected ? "border-ring bg-accent" : "border-input bg-card hover:bg-accent",
      )}
    >
      <img
        src={src}
        alt=""
        className="aspect-[3/1] w-full rounded-md object-cover"
      />
      <span className="flex items-center justify-between gap-1 px-1 typo-caption text-foreground">
        {name}
        {isSelected ? (
          <Check
            aria-hidden="true"
            className="size-3.5"
          />
        ) : null}
      </span>
    </button>
  )
}
