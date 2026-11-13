import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  ACTIVITY_KEYS,
  ActivityIcon,
  ALL_ACTIVITY_KEYS,
  CATEGORY_KEYS,
  CategoryIcon,
  isActivityKey,
  isCategoryKey,
} from "@/components/hobbyhub/ActivityIcon"
import { resources } from "@/i18n/resources"

// The catalogue from ADR-0020: 14 categories, 98 activities, 16 of them drawn.
describe("activity catalogue in the frontend", () => {
  it("knows the 14 categories and 98 activities", () => {
    expect(CATEGORY_KEYS).toHaveLength(14)
    expect(ALL_ACTIVITY_KEYS).toHaveLength(98)
    expect(new Set(ALL_ACTIVITY_KEYS).size).toBe(98)
    expect(ACTIVITY_KEYS).toHaveLength(16)
  })

  it.each(["cs", "en"] as const)("names every activity and category in %s", (language) => {
    const { activities, activityCategories } = resources[language].common.hobbyhub

    expect(Object.keys(activities).sort()).toEqual([...ALL_ACTIVITY_KEYS].sort())
    expect(Object.keys(activityCategories).sort()).toEqual([...CATEGORY_KEYS].sort())
  })

  it("tells known keys from unknown ones", () => {
    expect(isActivityKey("lukostrelba")).toBe(true)
    expect(isActivityKey("florbal")).toBe(true)
    expect(isActivityKey("micove-sporty")).toBe(false)
    expect(isCategoryKey("micove-sporty")).toBe(true)
    expect(isCategoryKey("lukostrelba")).toBe(false)
  })

  it("draws an activity without its own icon with its category's icon", () => {
    const { container: archery } = render(<ActivityIcon activity="lukostrelba" />)
    const { container: precision } = render(<CategoryIcon category="presnost" />)

    expect(archery.innerHTML).toBe(precision.innerHTML)
  })

  it("keeps the own icon of the original activities", () => {
    const { container: floorball } = render(<ActivityIcon activity="florbal" />)
    const { container: ballSports } = render(<CategoryIcon category="micove-sporty" />)

    expect(floorball.innerHTML).not.toBe(ballSports.innerHTML)
  })
})
