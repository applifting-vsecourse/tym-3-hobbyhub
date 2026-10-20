import type { TFunction } from "i18next"

import { isActivityKey } from "@/components/hobbyhub/ActivityIcon"

import type { Activity } from "@/features/activity/api/activitySchemas"

// The server sends Czech names; known activities are translated by their icon key.
export const activityName = (t: TFunction, activity: Pick<Activity, "name" | "icon">) =>
  isActivityKey(activity.icon) ? t(`hobbyhub.activities.${activity.icon}`) : activity.name
