import {
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_PREFIX,
} from '@/modules/profile/domain/profile';
import sharp from 'sharp';

// The profile photo is shown at most a few hundred pixels wide.
const AVATAR_SIZE_PX = 512;
const DOWNLOAD_TIMEOUT_MS = 5000;
// Refuse to read a huge download into memory; a photo of this size is far more
// than the converted result may hold.
const DOWNLOAD_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Downloads the photo Google gave and turns it into what `user.image` holds:
 * a WebP data URL within PROFILE_IMAGE_MAX_BYTES. Anything that goes wrong
 * (not an https URL, download, conversion, size) gives null, so the account is
 * created without a photo rather than pointing at a foreign domain.
 */
export async function googleAvatarAsDataUrl(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url || !url.startsWith('https://')) return null;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const source = Buffer.from(await response.arrayBuffer());
    if (source.length > DOWNLOAD_MAX_BYTES) return null;
    const webp = await sharp(source)
      .rotate()
      .resize(AVATAR_SIZE_PX, AVATAR_SIZE_PX, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
    if (webp.length > PROFILE_IMAGE_MAX_BYTES) return null;
    return `${PROFILE_IMAGE_PREFIX}${webp.toString('base64')}`;
  } catch {
    return null;
  }
}
