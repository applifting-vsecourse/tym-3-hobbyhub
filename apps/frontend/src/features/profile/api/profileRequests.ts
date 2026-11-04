import { api } from "@/lib/api-client"

import {
  profileSchema,
  type HomeAddress,
  type SaveInterestsInput,
  type UpdatePrivateDetailsInput,
  type UpdateProfileInput,
} from "@/features/profile/api/profileSchemas"

export const getProfile = async () => profileSchema.parse(await api.get("profile").json())

export const updateProfile = async (input: UpdateProfileInput) =>
  profileSchema.parse(await api.patch("profile", { json: input }).json())

export const updatePrivateDetails = async (input: UpdatePrivateDetailsInput) =>
  profileSchema.parse(await api.put("profile/private", { json: input }).json())

export const updateInterests = async (input: SaveInterestsInput) =>
  profileSchema.parse(await api.put("profile/activities", { json: input }).json())

export const updateLocation = async (input: HomeAddress) =>
  profileSchema.parse(await api.put("profile/location", { json: input }).json())
