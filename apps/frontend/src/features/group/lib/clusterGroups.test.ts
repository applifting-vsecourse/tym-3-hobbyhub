import type { Group } from "@/features/group/api/groupSchemas"
import { clusterGroups, type LocatedGroup } from "@/features/group/lib/clusterGroups"

const aGroup = (id: string, latitude: number, longitude: number): LocatedGroup =>
  ({ id, latitude, longitude }) as Group & { latitude: number; longitude: number }

describe("clusterGroups", () => {
  const prague = [aGroup("a", 50.1, 14.4), aGroup("b", 50.101, 14.401), aGroup("c", 50.102, 14.402)]
  const brno = aGroup("d", 49.2, 16.6)

  it("puts groups of one town into one cluster when zoomed out", () => {
    const clusters = clusterGroups([...prague, brno], 7)

    expect(clusters).toHaveLength(2)
    expect(clusters.find((cluster) => cluster.groups.length === 3)?.single).toBeNull()
    expect(clusters.find((cluster) => cluster.single)?.single?.id).toBe("d")
  })

  it("lets the cluster fall apart when zoomed in", () => {
    const clusters = clusterGroups(prague, 16)

    expect(clusters).toHaveLength(3)
    expect(clusters.every((cluster) => cluster.single !== null)).toBe(true)
  })

  it("centres a cluster between its groups", () => {
    const [cluster] = clusterGroups([aGroup("a", 50, 14), aGroup("b", 50.002, 14.002)], 7)

    expect(cluster?.latitude).toBeCloseTo(50.001)
    expect(cluster?.longitude).toBeCloseTo(14.001)
  })

  it("keeps the key of a cluster while the same groups sit together", () => {
    const [near] = clusterGroups(prague, 7)
    const [nearer] = clusterGroups(prague, 8)

    expect(near?.key).toBe("a+b+c")
    expect(nearer?.key).toBe(near?.key)
  })
})
