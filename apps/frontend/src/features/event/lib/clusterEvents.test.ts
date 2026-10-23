import { describe, expect, it } from "vitest"

import { clusterEvents, isInBounds, worldPixel } from "@/features/event/lib/clusterEvents"

// One degree is one pixel, so the cells are easy to count by hand.
const project = ({ latitude, longitude }: { latitude: number; longitude: number }) => ({
  x: longitude,
  y: latitude,
})
const CELL = { width: 10, height: 10 }
const at = (id: string, latitude: number, longitude: number) => ({ id, latitude, longitude })

describe("clusterEvents", () => {
  it("keeps far apart events on their own", () => {
    const groups = clusterEvents([at("a", 0, 0), at("b", 0, 100)], project, CELL)
    expect(groups.map((group) => group.events.length)).toEqual([1, 1])
  })

  it("groups events in the same cell and places the group in the middle", () => {
    const groups = clusterEvents([at("a", 2, 2), at("b", 4, 6)], project, CELL)
    expect(groups).toHaveLength(1)
    const group = groups[0]!
    expect(group.events.map((event) => event.id)).toEqual(["a", "b"])
    expect(group.latitude).toBe(3)
    expect(group.longitude).toBe(4)
  })

  it("groups close events even when a fixed grid would cut between them", () => {
    // 9 and 11 are on different sides of a cell edge at 10, but only 2 px apart.
    const groups = clusterEvents([at("a", 0, 9), at("b", 0, 11)], project, CELL)
    expect(groups).toHaveLength(1)
  })

  it("never leaves two groups closer than the cell, even after a group moved", () => {
    // c joins a (they are 6 apart), which moves a's middle to 3 and next to b at 10.
    const groups = clusterEvents([at("a", 0, 0), at("b", 0, 12), at("c", 0, 6)], project, CELL)
    expect(groups).toHaveLength(1)
  })

  it("keeps the selected event out of a group", () => {
    const groups = clusterEvents([at("a", 1, 1), at("b", 2, 2), at("c", 3, 3)], project, CELL, "b")
    expect(groups.map((group) => group.events.map((event) => event.id))).toEqual([
      ["b"],
      ["a", "c"],
    ])
  })

  it("gives a group a key that changes with its members", () => {
    const single = clusterEvents([at("a", 1, 1)], project, CELL)[0]!
    const pair = clusterEvents([at("a", 1, 1), at("b", 2, 2)], project, CELL)[0]!
    expect(single.key).not.toBe(pair.key)
  })
})

describe("worldPixel", () => {
  it("puts the centre of the world in the middle of the map", () => {
    const { x, y } = worldPixel({ latitude: 0, longitude: 0 }, 0)
    expect(x).toBeCloseTo(256)
    expect(y).toBeCloseTo(256)
  })

  it("doubles the distances with every zoom level", () => {
    const one = worldPixel({ latitude: 50, longitude: 14 }, 3)
    const two = worldPixel({ latitude: 50, longitude: 14 }, 4)
    expect(two.x).toBeCloseTo(one.x * 2)
    expect(two.y).toBeCloseTo(one.y * 2)
  })
})

describe("isInBounds", () => {
  const bounds = { west: 14, south: 50, east: 15, north: 51 }

  it("takes events inside the visible area, edges included", () => {
    expect(isInBounds({ latitude: 50.5, longitude: 14.5 }, bounds)).toBe(true)
    expect(isInBounds({ latitude: 50, longitude: 15 }, bounds)).toBe(true)
  })

  it("leaves out events outside of it", () => {
    expect(isInBounds({ latitude: 49.9, longitude: 14.5 }, bounds)).toBe(false)
    expect(isInBounds({ latitude: 50.5, longitude: 15.1 }, bounds)).toBe(false)
  })

  it("leaves out events with no place", () => {
    expect(isInBounds({ latitude: null, longitude: null }, bounds)).toBe(false)
  })
})
