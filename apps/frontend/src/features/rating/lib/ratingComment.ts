/**
 * Characters of a rating comment as the server and the database count them:
 * code points, after the same `trim()` the server does (#234, #235).
 */
export const charCount = (value: string) => [...value.trim()].length
