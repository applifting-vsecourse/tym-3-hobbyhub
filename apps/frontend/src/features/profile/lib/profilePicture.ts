import { avatarPicture, illustrationOf } from "@/components/hobbyhub/PersonAvatar"
import type { ProfilePicture } from "@/components/hobbyhub/ProfilePicturePicker"

/** What the picker shows for the stored picture: an illustration or the photo. */
export function pictureOf(image: string | null): ProfilePicture | null {
  if (!image) return null
  const avatar = illustrationOf(image)
  return avatar ? { kind: "avatar", avatar } : { kind: "photo", url: image }
}

/** The stored form of an illustration the picker chose. */
export const imageOfAvatar = avatarPicture
