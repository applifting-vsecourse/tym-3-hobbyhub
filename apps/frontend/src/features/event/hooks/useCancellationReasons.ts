import { useQuery } from "@tanstack/react-query"

import { cancellationReasonsQueryOptions } from "@/features/event/api/cancellationReasonsQueryOptions"

/** Loaded once the cancel dialog is wanted, not with every event page. */
export function useCancellationReasons(isEnabled: boolean) {
  return useQuery({ ...cancellationReasonsQueryOptions(), enabled: isEnabled })
}
