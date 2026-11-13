import { z } from "zod"

/** `?q=&offset=` of a list in the administration; anything odd falls back. */
export const adminListSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  offset: z.number().int().min(0).optional().catch(undefined),
})

export type AdminListSearch = z.infer<typeof adminListSearchSchema>

/** The URL keeps only what differs from the first page without a search. */
export const toAdminListSearch = (next: { search: string; offset: number }): AdminListSearch => ({
  q: next.search || undefined,
  offset: next.offset || undefined,
})
