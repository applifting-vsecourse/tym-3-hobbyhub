export const levelKeys = {
  all: () => ["levels"] as const,
  lists: () => [...levelKeys.all(), "list"] as const,
}
