import { useEffect, useId, useRef, useState } from "react"
import { Upload, UserRound } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ActivityAvatar, AVATAR_KINDS, type AvatarKind } from "@/components/hobbyhub/ActivityAvatar"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** What a photo may be: JPG or PNG, up to 5 MB. */
export const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png"] as const
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024

type PhotoProblem = "type" | "size"

const photoProblem = (file: Pick<File, "type" | "size">): PhotoProblem | null => {
  if (!(PROFILE_PHOTO_TYPES as readonly string[]).includes(file.type)) return "type"
  if (file.size > PROFILE_PHOTO_MAX_BYTES) return "size"
  return null
}

const PROBLEM_KEYS = {
  type: "hobbyhub.profilePicture.errorType",
  size: "hobbyhub.profilePicture.errorSize",
} as const

/**
 * One of our illustrated avatars, or the person's own photo as an object URL.
 * The picker only holds the choice; storing a photo is up to the screen.
 */
export type ProfilePicture = { kind: "avatar"; avatar: AvatarKind } | { kind: "photo"; url: string }

type ProfilePicturePickerProps = {
  value: ProfilePicture | null
  onChange: (value: ProfilePicture | null) => void
  /** Field label; defaults to "Profilový obrázek". */
  label?: string
  /** Small note next to the button, e.g. that the choice is not saved yet. */
  hint?: string
  className?: string
}

/**
 * Profilový obrázek — the chosen picture with a button that opens a sheet (a
 * drawer on phones, a dialog from `md`): our avatars to pick from, or an
 * upload of your own photo.
 */
export function ProfilePicturePicker({
  value,
  onChange,
  label,
  hint,
  className,
}: ProfilePicturePickerProps) {
  const { t } = useTranslation()
  const labelId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [problem, setProblem] = useState<PhotoProblem | null>(null)

  // An object URL is released once the photo is replaced or the picker goes.
  const photoUrl = value?.kind === "photo" ? value.url : null
  useEffect(() => {
    if (!photoUrl) return
    return () => URL.revokeObjectURL(photoUrl)
  }, [photoUrl])

  const choose = (next: ProfilePicture | null) => {
    onChange(next)
    setProblem(null)
    setIsOpen(false)
  }

  const chooseFile = (file: File) => {
    const found = photoProblem(file)
    setProblem(found)
    if (!found) choose({ kind: "photo", url: URL.createObjectURL(file) })
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p
        id={labelId}
        className="typo-label-lg text-foreground"
      >
        {label ?? t("hobbyhub.profilePicture.label")}
      </p>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex items-center gap-4"
      >
        {value?.kind === "photo" ? (
          <img
            src={value.url}
            alt={t("hobbyhub.profilePicture.chosenPhoto")}
            className="size-14 shrink-0 rounded-full object-cover"
          />
        ) : value?.kind === "avatar" ? (
          <ActivityAvatar
            avatar={value.avatar}
            size="xl"
            alt={t(`hobbyhub.avatars.${value.avatar}`)}
          />
        ) : (
          // Nothing chosen yet: a quiet person, not a dashed empty seat (that
          // one means "a place is free" in the roster).
          <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UserRound
              aria-hidden="true"
              className="size-6"
            />
            <span className="sr-only">{t("hobbyhub.profilePicture.none")}</span>
          </span>
        )}
        <div className="flex flex-col items-start gap-1">
          <Button
            type="button"
            variant="outline"
            className="max-md:h-11"
            onClick={() => setIsOpen(true)}
          >
            {value ? t("hobbyhub.profilePicture.change") : t("hobbyhub.profilePicture.choose")}
          </Button>
          {hint ? <p className="typo-small text-muted-foreground">{hint}</p> : null}
        </div>
      </div>

      <ResponsiveSheet
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={t("hobbyhub.profilePicture.sheetTitle")}
        description={t("hobbyhub.profilePicture.sheetDescription")}
        footer={
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="max-md:h-11"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              {t("hobbyhub.profilePicture.upload")}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                className="max-md:h-11"
                onClick={() => choose(null)}
              >
                {t("hobbyhub.profilePicture.remove")}
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="flex flex-col gap-3 pb-2">
          <ul className="grid grid-cols-3 gap-3 md:grid-cols-4">
            {AVATAR_KINDS.map((avatar) => {
              const isSelected = value?.kind === "avatar" && value.avatar === avatar
              return (
                <li key={avatar}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => choose({ kind: "avatar", avatar })}
                    className={cn(
                      "flex w-full flex-col items-center gap-1 rounded-lg border p-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      isSelected
                        ? "border-ring bg-accent text-accent-foreground"
                        : "border-input bg-card text-foreground hover:bg-accent",
                    )}
                  >
                    <ActivityAvatar
                      avatar={avatar}
                      size="2xl"
                    />
                    <span className="typo-caption">{t(`hobbyhub.avatars.${avatar}`)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <input
            ref={fileInputRef}
            type="file"
            accept={PROFILE_PHOTO_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-label={t("hobbyhub.profilePicture.upload")}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) chooseFile(file)
              // The same file can be chosen again after a refusal.
              event.target.value = ""
            }}
          />
          {problem ? (
            <p
              role="alert"
              className="typo-small text-destructive"
            >
              {t(PROBLEM_KEYS[problem])}
            </p>
          ) : null}
        </div>
      </ResponsiveSheet>
    </div>
  )
}
