export const eventKeys = {
  all: () => ["events"] as const,
  lists: () => [...eventKeys.all(), "list"] as const,
  // Public detail (F-02.4).
  publicDetails: () => [...eventKeys.all(), "public-detail"] as const,
  publicDetail: (id: string) => [...eventKeys.publicDetails(), id] as const,
}
