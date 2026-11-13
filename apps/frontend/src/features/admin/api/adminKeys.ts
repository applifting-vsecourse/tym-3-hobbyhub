// #238: everything the administration caches sits under one root, so signing
// out of it drops all of it and nothing of the app's own cache.
export const adminKeys = {
  all: () => ["admin"] as const,
  session: () => [...adminKeys.all(), "session"] as const,
  users: (search: string, offset: number) =>
    [...adminKeys.all(), "users", { search, offset }] as const,
  user: (id: string) => [...adminKeys.all(), "user", id] as const,
  userEvents: (id: string) => [...adminKeys.user(id), "events"] as const,
  events: (search: string, offset: number) =>
    [...adminKeys.all(), "events", { search, offset }] as const,
  event: (id: string) => [...adminKeys.all(), "event", id] as const,
  groups: (search: string, offset: number) =>
    [...adminKeys.all(), "groups", { search, offset }] as const,
  group: (id: string) => [...adminKeys.all(), "group", id] as const,
  groupRequests: (id: string) => [...adminKeys.group(id), "requests"] as const,
  administrators: () => [...adminKeys.all(), "administrators"] as const,
}
