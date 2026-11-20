import { useEffect, useId, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { Plus } from "lucide-react"
import { useForm, useFormState, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { PersonAvatar } from "@/components/hobbyhub/PersonAvatar"
import { RatingStars } from "@/components/hobbyhub/RatingScore"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { StarRatingInput } from "@/components/hobbyhub/StarRatingInput"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField, FormItem, FormMessage } from "@/components/ui/form"
import { RATING_STARS_MAX } from "@/lib/ratingScore"

import {
  RATING_COMMENT_MAX_LENGTH,
  type RatingInput,
  type RatingTarget,
} from "@/features/rating/api/ratingSchemas"
import { RatingCommentField } from "@/features/rating/components/RatingCommentField"
import {
  clearPrefill,
  draftKey,
  EMPTY_DRAFT,
  emptyDrafts,
  isOpenTarget,
  LOW_STARS,
  type ParticipantDrafts,
  prefill,
  readyRatings,
  type ReadyRating,
  reviewOf,
} from "@/features/rating/lib/participantDrafts"
import { charCount } from "@/features/rating/lib/ratingComment"
import { ratingErrorMessage } from "@/features/rating/lib/ratingRefusal"
import { sendEach } from "@/features/rating/lib/sendRatings"

type FormValues = { drafts: ParticipantDrafts }

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z.object({
    drafts: z.record(
      z.string(),
      z
        .object({
          stars: z.number().int().min(1).max(RATING_STARS_MAX).nullable(),
          comment: z.string().refine((comment) => charCount(comment) <= RATING_COMMENT_MAX_LENGTH, {
            message: t("rating.form.commentTooLong", { max: RATING_COMMENT_MAX_LENGTH }),
          }),
        })
        // A comment goes only with stars: alone it would be lost on sending.
        .refine((draft) => draft.stars !== null || draft.comment.trim() === "", {
          path: ["stars"],
          message: t("rating.participants.commentWithoutStars"),
        }),
    ),
  })

type RateParticipantsFormProps = {
  /** Everyone the main organizer rates at the event, rated or not, in roster order. */
  participants: RatingTarget[]
  /** The end of the rating period, formatted for the person. */
  deadline: string
  /** Sends one participant's rating. Throws when it is not saved. */
  onRate: (participantId: string, input: RatingInput) => Promise<void>
  /** After ratings went out: the page reads again what is saved. */
  onSent: () => Promise<unknown>
}

/**
 * #235: the main organizer rates the participants from one list. Tapping the
 * stars only drafts; the drafts go out together after a review that says,
 * once, that a sent rating is final. Any part may go now and the rest later.
 * Five stars can be filled in for everyone left, and taken back, so a large
 * event takes a few taps and the exceptions by hand.
 * Each rating is sent on its own, so one refusal stops nothing else, and the
 * row says why. The drafts stay on this page only: the participant learns
 * nothing until the rating period ends.
 */
export function RateParticipantsForm({
  participants,
  deadline,
  onRate,
  onSent,
}: RateParticipantsFormProps) {
  const { t } = useTranslation()
  const formId = useId()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { drafts: emptyDrafts(participants) },
  })
  const drafts = useWatch({ control: form.control, name: "drafts" })
  const { isSubmitting, isSubmitSuccessful } = useFormState({ control: form.control })
  const ready = readyRatings(participants, drafts)
  const openCount = participants.filter(isOpenTarget).length

  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isNothingChosen, setIsNothingChosen] = useState(false)
  /** Why a row's last try was not saved, by participant. */
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [retryingId, setRetryingId] = useState<string | null>(null)
  /** Whose stars the prefill put in, until the organizer changes them. */
  const [prefilledIds, setPrefilledIds] = useState<string[]>([])
  const canPrefill = participants.some(
    (target) => isOpenTarget(target) && drafts[draftKey(target.user.id)]?.stars == null,
  )

  const togglePrefill = () => {
    const current = form.getValues("drafts")
    if (prefilledIds.length > 0) {
      form.setValue("drafts", clearPrefill(current, prefilledIds), { shouldDirty: true })
      setPrefilledIds([])
      return
    }
    const filled = prefill(participants, current)
    form.setValue("drafts", filled.drafts, { shouldDirty: true })
    setPrefilledIds(filled.prefilledIds)
  }

  // A prefilled row the organizer touches is theirs: undoing the prefill
  // leaves it alone.
  const keepByHand = (userId: string) =>
    setPrefilledIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : ids))

  // Everything went out: start clean, so a draft begun now is guarded again
  // (a successful submit otherwise keeps the guard down).
  useEffect(() => {
    if (isSubmitSuccessful) form.reset(undefined, { keepDefaultValues: true })
  }, [form, isSubmitSuccessful])

  const send = ({ target, stars, comment }: ReadyRating) =>
    onRate(target.user.id, { stars, comment: comment || undefined })

  const openReview = async () => {
    setIsNothingChosen(false)
    if (!(await form.trigger(undefined, { shouldFocus: true }))) return
    if (ready.length === 0) {
      setIsNothingChosen(true)
      return
    }
    setIsReviewOpen(true)
  }

  const submit = async (values: FormValues) => {
    const toSend = readyRatings(participants, values.drafts)
    const failures = await sendEach(toSend, ({ target }) => target.user.id, send)
    const errors = Object.fromEntries(
      [...failures].map(([userId, error]) => [userId, ratingErrorMessage(t, error)]),
    )
    // What was saved leaves the drafts; what was not stays as it was typed.
    const next = { ...values.drafts }
    for (const { target } of toSend) {
      if (!(target.user.id in errors)) next[draftKey(target.user.id)] = EMPTY_DRAFT
    }
    form.reset({ drafts: next }, { keepDefaultValues: true })
    setRowErrors(errors)
    setPrefilledIds((ids) => ids.filter((id) => id in errors))
    setIsReviewOpen(false)
    await onSent()
    // A failed rating is still a draft: the submit did not succeed, so
    // leaving the page keeps asking first.
    if (failures.size > 0) throw new Error("Some ratings were not saved")
  }

  const retry = async (target: RatingTarget) => {
    const name = `drafts.${draftKey(target.user.id)}` as const
    if (!(await form.trigger(name, { shouldFocus: true }))) return
    const rating = readyRatings([target], form.getValues("drafts"))[0]
    if (!rating) return
    setRetryingId(target.user.id)
    try {
      await send(rating)
      form.resetField(name)
      setRowErrors(({ [target.user.id]: _sent, ...rest }) => rest)
      keepByHand(target.user.id)
    } catch (error) {
      setRowErrors((errors) => ({ ...errors, [target.user.id]: ratingErrorMessage(t, error) }))
    } finally {
      setRetryingId(null)
    }
    await onSent()
  }

  const isBusy = isSubmitting || retryingId !== null

  return (
    <AppForm
      id={formId}
      form={form}
      onSubmit={submit}
      // On a phone the bar is fixed over the end of the page: keep room for it.
      className="flex flex-col gap-4 max-md:pb-20"
    >
      {prefilledIds.length > 0 || canPrefill ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start max-md:h-11"
          disabled={isBusy}
          onClick={togglePrefill}
        >
          {prefilledIds.length > 0
            ? t("rating.participants.undoPrefill")
            : t("rating.participants.prefill")}
        </Button>
      ) : null}

      <ul className="flex flex-col divide-y divide-border">
        {participants.map((target) => (
          <ParticipantRow
            key={target.user.id}
            target={target}
            isPrefilled={prefilledIds.includes(target.user.id)}
            onStarsChosen={() => keepByHand(target.user.id)}
            error={isOpenTarget(target) ? (rowErrors[target.user.id] ?? null) : null}
            isDisabled={isBusy}
            isRetrying={retryingId === target.user.id}
            onRetry={() => void retry(target)}
          />
        ))}
      </ul>

      {/* On phones fixed above the BottomNav (and under its raised "Přidat
        akci"), on larger screens stuck to the bottom of the window while the
        list is longer than it. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-border bg-background px-page pt-3 pb-above-bottom-nav md:sticky md:inset-x-auto md:px-0 md:py-4">
        {isNothingChosen ? (
          <p
            role="alert"
            className="typo-small text-destructive-ink"
          >
            {t("rating.participants.nothingChosen")}
          </p>
        ) : null}
        <Button
          type="button"
          className="w-full md:w-auto md:self-start"
          disabled={isBusy}
          onClick={() => void openReview()}
        >
          {t("rating.participants.review", { count: ready.length })}
        </Button>
      </div>

      <ResponsiveSheet
        isOpen={isReviewOpen}
        onOpenChange={(isOpen) => {
          if (!isSubmitting) setIsReviewOpen(isOpen)
        }}
        title={t("rating.participants.reviewTitle")}
        description={t("rating.participants.reviewFinal", { deadline })}
        footer={
          <>
            <Button
              type="submit"
              form={formId}
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t("rating.form.submitting")
                : t("rating.participants.send", { count: ready.length })}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isSubmitting}
              onClick={() => setIsReviewOpen(false)}
            >
              {t("rating.participants.backToEdit")}
            </Button>
          </>
        }
      >
        <RatingsReview
          ready={ready}
          leftCount={openCount - ready.length}
          deadline={deadline}
        />
      </ResponsiveSheet>
    </AppForm>
  )
}

function ParticipantRow({
  target,
  isPrefilled,
  onStarsChosen,
  error,
  isDisabled,
  isRetrying,
  onRetry,
}: {
  target: RatingTarget
  /** The stars came from the prefill, not from the organizer. */
  isPrefilled: boolean
  /** The organizer chose the stars of this row. */
  onStarsChosen: () => void
  error: string | null
  isDisabled: boolean
  isRetrying: boolean
  onRetry: () => void
}) {
  const { t } = useTranslation()
  const labelId = useId()
  const name = `drafts.${draftKey(target.user.id)}` as const
  const draft = useWatch<FormValues, typeof name>({ name }) ?? EMPTY_DRAFT
  const [isCommentOpen, setIsCommentOpen] = useState(false)
  const { user, rating } = target
  const isOpen = isOpenTarget(target)
  const isLow = draft.stars !== null && draft.stars <= LOW_STARS
  const isCommentShown = isOpen && (isCommentOpen || isLow || draft.comment !== "")

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 md:grid-cols-[auto_minmax(0,1fr)_auto]">
        <PersonAvatar
          name={user.name}
          size="md"
        />
        <Link
          to="/profile/$userId"
          params={{ userId: user.id }}
          className="truncate typo-label-lg text-foreground underline-offset-4 hover:underline"
        >
          {user.name}
        </Link>

        <div className="col-start-2 flex flex-wrap items-center gap-x-2 gap-y-1 md:col-start-3 md:row-start-1">
          {rating ? (
            <>
              <RatingStars stars={rating.stars} />
              <span className="sr-only">
                {t("rating.starsOf", { count: rating.stars, max: RATING_STARS_MAX })}
              </span>
            </>
          ) : isOpen ? (
            <>
              <span
                id={labelId}
                className="sr-only"
              >
                {t("rating.participants.starsLabel", { name: user.name })}
              </span>
              <FormField
                name={`${name}.stars`}
                render={({ field, fieldState }) => (
                  <FormItem className="gap-1">
                    <StarRatingInput
                      value={field.value as number | null}
                      onValueChange={(stars) => {
                        field.onChange(stars)
                        onStarsChosen()
                      }}
                      aria-labelledby={labelId}
                      aria-invalid={fieldState.invalid}
                      isDisabled={isDisabled}
                      // The star's circle is wider than the star: pull it to the name's edge.
                      className="-ml-2 md:-ml-1"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isPrefilled ? (
                <span className="typo-caption text-muted-foreground">
                  {t("rating.participants.prefilled")}
                </span>
              ) : null}
              {isCommentShown ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="max-md:h-11"
                  disabled={isDisabled}
                  onClick={() => setIsCommentOpen(true)}
                >
                  <Plus aria-hidden="true" />
                  {t("rating.participants.addComment")}{" "}
                  <span className="sr-only">{user.name}</span>
                </Button>
              )}
            </>
          ) : (
            <span className="typo-small text-muted-foreground">{t("rating.page.notRated")}</span>
          )}
        </div>
      </div>

      {rating?.comment ? (
        <p className="max-w-prose typo-body break-words whitespace-pre-line text-muted-foreground">
          {rating.comment}
        </p>
      ) : null}

      {isCommentShown ? (
        <RatingCommentField<FormValues>
          name={`${name}.comment`}
          rows={3}
          placeholder={isLow ? t("rating.participants.whyPlaceholder") : undefined}
          isDisabled={isDisabled}
        />
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="max-md:h-11"
              disabled={isDisabled}
              onClick={onRetry}
            >
              {isRetrying ? t("rating.form.submitting") : t("rating.page.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    </li>
  )
}

/**
 * What is about to go out: the usual number of stars in one line, everything
 * else one by one with the lowest first, and who stays for later.
 */
function RatingsReview({
  ready,
  leftCount,
  deadline,
}: {
  ready: ReadyRating[]
  leftCount: number
  deadline: string
}) {
  const { t, i18n } = useTranslation()
  const { group, singles } = reviewOf(ready)
  const names = new Intl.ListFormat(i18n.resolvedLanguage, { type: "conjunction" })

  return (
    <div className="flex flex-col gap-4">
      {group ? (
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 typo-label-lg text-foreground">
            <span>{t("rating.participants.groupCount", { count: group.ratings.length })}</span>
            <RatingStars stars={group.stars} />
            <span className="sr-only">
              {t("rating.starsOf", { count: group.stars, max: RATING_STARS_MAX })}
            </span>
          </p>
          <p className="typo-small text-muted-foreground">
            {names.format(group.ratings.map(({ target }) => target.user.name))}
          </p>
        </div>
      ) : null}

      {singles.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border">
          {singles.map(({ target, stars, comment }) => (
            <li
              key={target.user.id}
              className="flex flex-col gap-1 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate typo-label-lg text-foreground">
                  {target.user.name}
                </span>
                <RatingStars stars={stars} />
                <span className="sr-only">
                  {t("rating.starsOf", { count: stars, max: RATING_STARS_MAX })}
                </span>
              </div>
              {comment ? (
                <p className="typo-small break-words whitespace-pre-line text-muted-foreground">
                  {comment}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {leftCount > 0 ? (
        <p className="typo-small text-muted-foreground">
          {t("rating.participants.leftForLater", { count: leftCount, deadline })}
        </p>
      ) : null}
    </div>
  )
}
