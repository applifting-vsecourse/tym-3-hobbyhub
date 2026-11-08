import { z } from "zod"

import { notificationKindSchema } from "@/features/notification/api/notificationSchemas"

// The filter of the notification page as it sits in the address (#175). A
// hand-written link with an unknown kind shows everything instead of failing.
export const notificationsSearchSchema = z.object({
  kind: notificationKindSchema.optional().catch(undefined),
})
