import type { TFunction } from "i18next"
import { z } from "zod"

import { BIRTH_YEAR_MESSAGES, birthYearProblem } from "@/lib/birthYear"

import { GENDERS, type Profile } from "@/features/profile/api/profileSchemas"
import { BIO_MAX_LENGTH, NAME_MAX_LENGTH } from "@/features/profile/lib/profileLimits"

// Built per render so validation messages follow the current language.
export const createEditProfileSchema = (t: TFunction) =>
  z
    .object({
      // Counted in characters, as the server does, not UTF-16 units.
      name: z
        .string()
        .trim()
        .min(1, t("profile.public.nameRequired"))
        .refine(
          (value) => [...value].length <= NAME_MAX_LENGTH,
          t("profile.public.nameTooLong", { max: NAME_MAX_LENGTH }),
        ),
      bio: z
        .string()
        .trim()
        .refine(
          (value) => [...value].length <= BIO_MAX_LENGTH,
          t("profile.public.bioTooLong", { max: BIO_MAX_LENGTH }),
        ),
      image: z.string().nullable(),
      cover: z.string().nullable(),
      selection: z.array(z.object({ activityId: z.string(), levelId: z.string().nullable() })),
      // Picked from the suggestions; the address is saved whole or not at all.
      address: z
        .object({
          label: z.string(),
          street: z.string(),
          city: z.string(),
          postalCode: z.string(),
          country: z.string(),
          latitude: z.number(),
          longitude: z.number(),
        })
        .nullable(),
      // An account made another way may have neither; both or none are saved.
      gender: z.enum(GENDERS).optional(),
      // The typed year; only the year is kept, never the full date (#174).
      birthYear: z.string().superRefine((value, context) => {
        const problem = birthYearProblem(value, new Date())
        // An empty year is checked together with the gender below.
        if (problem && problem !== "required") {
          context.addIssue({ code: "custom", message: t(BIRTH_YEAR_MESSAGES[problem]) })
        }
      }),
    })
    .superRefine((values, context) => {
      const hasBirthYear = values.birthYear.trim() !== ""
      if (values.gender && !hasBirthYear) {
        context.addIssue({
          code: "custom",
          path: ["birthYear"],
          message: t(BIRTH_YEAR_MESSAGES.required),
        })
      }
      if (hasBirthYear && !values.gender) {
        context.addIssue({
          code: "custom",
          path: ["gender"],
          message: t("auth.validation.genderRequired"),
        })
      }
    })

export type EditProfileValues = z.infer<ReturnType<typeof createEditProfileSchema>>

/** The saved profile as the form holds it. */
export const editValuesOf = (profile: Profile): EditProfileValues => ({
  name: profile.name,
  bio: profile.bio ?? "",
  image: profile.image,
  cover: profile.cover,
  selection: profile.interests.map((interest) => ({
    activityId: interest.activity.id,
    levelId: interest.level?.id ?? null,
  })),
  address: profile.address && {
    ...profile.address,
    label: `${profile.address.street}, ${profile.address.postalCode} ${profile.address.city}, ${profile.address.country}`,
  },
  gender: profile.gender ?? undefined,
  birthYear: profile.birthYear === null ? "" : String(profile.birthYear),
})
