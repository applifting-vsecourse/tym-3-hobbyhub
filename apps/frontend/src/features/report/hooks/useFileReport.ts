import { useMutation } from "@tanstack/react-query"

import { fileReport } from "@/features/report/api/fileReport"

/** Nothing on the page changes with a report: only the administration sees it. */
export function useFileReport() {
  return useMutation({ mutationFn: fileReport })
}
