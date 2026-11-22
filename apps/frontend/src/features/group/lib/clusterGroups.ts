import type { Group } from "@/features/group/api/groupSchemas"

export type LocatedGroup = Group & { latitude: number; longitude: number }

export type GroupCluster = {
  /** Stable while the same groups sit together, so their marker is not rebuilt on every zoom. */
  key: string
  latitude: number
  longitude: number
  groups: LocatedGroup[]
  /** Set when the cluster is just one group. */
  single: LocatedGroup | null
}

/** Pins closer than this on screen become one cluster. */
const CLUSTER_PIXELS = 56

/**
 * Groups on the map: pins that would sit closer than `CLUSTER_PIXELS` at this
 * zoom share one cluster; zoomed in they fall apart. Plain grid cells, like the
 * map of events: cheap, and the same groups always land together.
 */
export function clusterGroups(groups: LocatedGroup[], zoom: number): GroupCluster[] {
  const cell = (CLUSTER_PIXELS * 360) / (256 * 2 ** zoom)
  const cells = new Map<string, LocatedGroup[]>()
  for (const group of groups) {
    const key = `${Math.round(group.latitude / cell)}:${Math.round(group.longitude / cell)}`
    cells.set(key, [...(cells.get(key) ?? []), group])
  }
  return [...cells.values()].map((inCell) => {
    const single = inCell.length === 1 ? (inCell[0] ?? null) : null
    return {
      key: inCell
        .map((group) => group.id)
        .sort()
        .join("+"),
      single,
      latitude: inCell.reduce((sum, group) => sum + group.latitude, 0) / inCell.length,
      longitude: inCell.reduce((sum, group) => sum + group.longitude, 0) / inCell.length,
      groups: inCell,
    }
  })
}
