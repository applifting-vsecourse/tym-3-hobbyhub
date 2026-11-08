import { fireEvent, screen, within } from "@testing-library/react"

import { renderWithRouter } from "@/test/renderWithRouter"

import { HowItWorks } from "@/features/landing/components/HowItWorks"

// jsdom lays nothing out: every rectangle is zero and the page has no height.
// The tests give the page a height and each step a top of its own.
function setPageHeight(height: number) {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: height,
  })
}

function placeSteps(tops: number[]) {
  steps().forEach((step, index) => {
    vi.spyOn(step, "getBoundingClientRect").mockReturnValue({ top: tops[index] } as DOMRect)
  })
  fireEvent.scroll(window)
}

const steps = () => within(screen.getByRole("list")).getAllByRole("listitem")
const currentIndex = () => steps().findIndex((step) => step.getAttribute("aria-current") === "step")

describe("HowItWorks", () => {
  afterEach(() => {
    // Back to jsdom's own value, which lives on the prototype.
    delete (document.documentElement as { scrollHeight?: number }).scrollHeight
    vi.restoreAllMocks()
  })

  it("makes current the last step whose top has scrolled above the reading line", async () => {
    setPageHeight(5000)
    await renderWithRouter(<HowItWorks />)

    placeSteps([-400, 100, 900, 1600])

    expect(currentIndex()).toBe(1)
  })

  it("makes the last step current at the bottom of the page, even below the reading line", async () => {
    setPageHeight(5000)
    await renderWithRouter(<HowItWorks />)
    placeSteps([-400, 100, 900, 1600])
    expect(currentIndex()).toBe(1)

    // Scrolled to the very bottom: the short last step never reaches the line.
    setPageHeight(window.innerHeight)
    placeSteps([-2000, -1200, -400, 700])

    expect(currentIndex()).toBe(3)
  })

  it("keeps the text of a step still to come at full contrast, with a muted heading", async () => {
    setPageHeight(5000)
    await renderWithRouter(<HowItWorks />)
    placeSteps([100, 900, 1600, 2400])

    expect(currentIndex()).toBe(0)
    const upcoming = steps()[3]
    if (!upcoming) throw new Error("expected four steps")
    expect(within(upcoming).getByRole("heading", { level: 3 })).toHaveClass("text-muted-foreground")
    for (const element of [upcoming, ...upcoming.querySelectorAll("*")]) {
      expect(element.getAttribute("class") ?? "").not.toMatch(/opacity-/)
    }
  })
})
