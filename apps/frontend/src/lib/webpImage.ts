/** A picture is stored as WebP text on the profile; this is the size limit of the picture itself. */
export const WEBP_IMAGE_MAX_BYTES = 2 * 1024 * 1024

/** Longest side of a profile photo and of a cover picture, in pixels: bigger only costs bytes. */
export const PHOTO_MAX_SIDE_PX = 512
export const COVER_MAX_SIDE_PX = 1440
const WEBP_QUALITY = 0.85
const WEBP_PREFIX = "data:image/webp;base64,"

export type PhotoProblem = "tooLarge" | "unreadable"

export class PhotoError extends Error {
  constructor(readonly problem: PhotoProblem) {
    super(problem)
  }
}

/** Size of the picture inside a base64 data URL, without the padding. */
export function dataUrlBytes(dataUrl: string): number {
  const payload = dataUrl.slice(dataUrl.indexOf(",") + 1)
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0
  return Math.floor((payload.length * 3) / 4) - padding
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new PhotoError("unreadable"))
    image.src = url
  })

/**
 * Turns the picked picture into a WebP data URL, scaled down to a profile
 * photo's size. Rejects with a PhotoError when it cannot be read or is still
 * over the limit.
 */
export async function toWebpDataUrl(url: string, maxSidePx = PHOTO_MAX_SIDE_PX): Promise<string> {
  const image = await loadImage(url)
  const scale = Math.min(1, maxSidePx / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height)

  const dataUrl = canvas.toDataURL("image/webp", WEBP_QUALITY)
  // A browser that cannot write WebP answers with a PNG instead.
  if (!dataUrl.startsWith(WEBP_PREFIX)) throw new PhotoError("unreadable")
  if (dataUrlBytes(dataUrl) > WEBP_IMAGE_MAX_BYTES) throw new PhotoError("tooLarge")
  return dataUrl
}
