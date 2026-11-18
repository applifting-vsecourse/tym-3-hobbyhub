import { z } from "zod"

import { ADMIN_EVENT_FILTERS, ADMIN_USER_FILTERS } from "@/features/admin/api/adminSchemas"

/** `?q=&offset=` of a list in the administration; anything odd falls back. */
export const adminListSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  offset: z.number().int().min(0).optional().catch(undefined),
})

export type AdminListSearch = z.infer<typeof adminListSearchSchema>

/** The lists with a smart filter (#271) add `?filter=`; an unknown value is no filter. */
export const adminUsersSearchSchema = adminListSearchSchema.extend({
  filter: z.enum(ADMIN_USER_FILTERS).optional().catch(undefined),
})

export const adminEventsSearchSchema = adminListSearchSchema.extend({
  filter: z.enum(ADMIN_EVENT_FILTERS).optional().catch(undefined),
})

/** The URL keeps only what differs from the first page without a search. */
export const toAdminListSearch = (next: { search: string; offset: number }): AdminListSearch => ({
  q: next.search || undefined,
  offset: next.offset || undefined,
})
