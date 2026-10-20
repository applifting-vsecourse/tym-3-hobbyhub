export const eventKeys = {
  all: () => ["events"] as const,
  details: () => [...eventKeys.all(), "detail"] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
}
