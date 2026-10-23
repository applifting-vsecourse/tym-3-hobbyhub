export type Locatable = { id: string; latitude: number; longitude: number }

export type EventGroup<T extends Locatable> = {
  /** Stable while the members stay the same. */
  key: string
  latitude: number
  longitude: number
  events: T[]
}

/** Pins are wide and low, so the reach of a group is not square. */
export type CellSize = { width: number; height: number }

type Project = (point: { latitude: number; longitude: number }) => { x: number; y: number }

/**
 * Groups events whose pins would overlap on screen. Each event joins the first
 * group whose middle is closer than `cellSize` pixels (`project` turns a
 * position into pixels at the current zoom), or starts a new one, so two groups
 * are never closer than that. Events in `keepSingle` always stay on their own
 * (the selected one).
 */
export function clusterEvents<T extends Locatable>(
  events: T[],
  project: Project,
  cellSize: CellSize,
  keepSingle: string | null = null,
): EventGroup<T>[] {
  const singles: EventGroup<T>[] = []
  type Cluster = { members: T[]; x: number; y: number }
  const clusters: Cluster[] = []
  const isNear = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) < cellSize.width && Math.abs(a.y - b.y) < cellSize.height
  // The middle of a group is the average of its members' positions.
  const join = (cluster: Cluster, members: T[], x: number, y: number, count: number) => {
    const total = cluster.members.length + count
    cluster.x = (cluster.x * cluster.members.length + x * count) / total
    cluster.y = (cluster.y * cluster.members.length + y * count) / total
    cluster.members.push(...members)
  }
  for (const event of events) {
    if (event.id === keepSingle) {
      singles.push(toGroup([event]))
      continue
    }
    const point = project(event)
    const near = clusters.find((cluster) => isNear(cluster, point))
    if (near) join(near, [event], point.x, point.y, 1)
    else clusters.push({ members: [event], ...point })
  }
  // A group's middle moves as it grows, which can bring two groups closer than
  // `cellSize`: merge those until none is.
  for (let hasMerged = true; hasMerged;) {
    hasMerged = false
    for (let a = 0; a < clusters.length && !hasMerged; a += 1) {
      for (let b = a + 1; b < clusters.length && !hasMerged; b += 1) {
        const first = clusters[a]
        const second = clusters[b]
        if (!first || !second || !isNear(first, second)) continue
        join(first, second.members, second.x, second.y, second.members.length)
        clusters.splice(b, 1)
        hasMerged = true
      }
    }
  }
  return [...singles, ...clusters.map((cluster) => toGroup(cluster.members))]
}

function toGroup<T extends Locatable>(events: T[]): EventGroup<T> {
  const mean = (pick: (event: T) => number) =>
    events.reduce((sum, event) => sum + pick(event), 0) / events.length
  return {
    key: events.map((event) => event.id).join("|"),
    latitude: mean((event) => event.latitude),
    longitude: mean((event) => event.longitude),
    events,
  }
}

const TILE_SIZE = 512

/**
 * Position on the whole-world Mapbox map at `zoom`, in pixels. It does not move
 * when the map is panned, so groups only change when the zoom does.
 */
export function worldPixel(
  { latitude, longitude }: { latitude: number; longitude: number },
  zoom: number,
): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom
  const sine = Math.sin((latitude * Math.PI) / 180)
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale,
  }
}

export type MapBounds = { west: number; south: number; east: number; north: number }

/** Whether an event lies inside the part of the map that is on screen. */
export const isInBounds = (
  { latitude, longitude }: { latitude: number | null; longitude: number | null },
  bounds: MapBounds,
): boolean =>
  latitude !== null &&
  longitude !== null &&
  latitude >= bounds.south &&
  latitude <= bounds.north &&
  longitude >= bounds.west &&
  longitude <= bounds.east
