export const eventKeys = {
  all: () => ["events"] as const,
  lists: () => [...eventKeys.all(), "list"] as const,
  details: () => [...eventKeys.all(), "detail"] as const,
  // Public detail (F-02.4): another shape than the `Event` stored under `detail`.
  publicDetails: () => [...eventKeys.all(), "public-detail"] as const,
  publicDetail: (id: string) => [...eventKeys.publicDetails(), id] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
}
