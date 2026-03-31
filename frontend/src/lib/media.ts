/**
 * Returns a same-domain path for a media asset by GUID.
 * Resolved via the Next.js rewrite: /media/:guid → <API_BASE>/media/api/media/:guid
 *
 * Works with <img>, <video>, and next/image without extra remotePatterns config.
 */
export function mediaUrl(guid: string): string {
  return `/media/${guid}`;
}
