import type { TFunction } from "i18next"
import { z } from "zod"

import { isAdult } from "@/lib/birthDate"

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
      birthDate: z
        .string()
        .refine(
          (value) => value === "" || isAdult(value, new Date()),
          t("auth.validation.underage"),
        ),
    })
    .superRefine((values, context) => {
      if (values.gender && !values.birthDate) {
        context.addIssue({
          code: "custom",
          path: ["birthDate"],
          message: t("auth.validation.birthDateRequired"),
        })
      }
      if (values.birthDate && !values.gender) {
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
  birthDate: profile.birthDate ?? "",
})
