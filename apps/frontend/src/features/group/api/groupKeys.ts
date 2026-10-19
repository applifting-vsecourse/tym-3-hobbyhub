export const groupKeys = {
  all: () => ["groups"] as const,
  details: () => [...groupKeys.all(), "detail"] as const,
  detail: (id: string) => [...groupKeys.details(), id] as const,
}
