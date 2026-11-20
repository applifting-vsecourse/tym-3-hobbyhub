import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ScrollToTopButton } from "@/components/hobbyhub/ScrollToTopButton"

const preferReducedMotion = (isReduced: boolean) =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: query === "(prefers-reduced-motion: reduce)" && isReduced,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  )

/** How far down the page is; jsdom never scrolls on its own. */
const scrollPageTo = (y: number) => {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true })
  act(() => {
    fireEvent.scroll(window)
  })
}

const button = () => screen.queryByRole("button", { name: "Zpět nahoru" })

/**
 * The button whether it is shown or not. Hidden, it is out of the
 * accessibility tree and has no accessible name, so look it up by its label.
 */
const anyButton = () => screen.getByLabelText("Zpět nahoru")

const renderWithMain = (ui: React.ReactNode) =>
  render(
    <>
      <main
        id="main-content"
        tabIndex={-1}
      />
      {ui}
    </>,
  )

describe("ScrollToTopButton", () => {
  let scrollTo: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    preferReducedMotion(false)
    scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined)
  })

  afterEach(() => {
    scrollPageTo(0)
    vi.restoreAllMocks()
  })

  describe("without a target", () => {
    it("hides at the top of the page, keeping its room, and shows once scrolled down", () => {
      renderWithMain(<ScrollToTopButton />)

      expect(button()).toBeNull()
      expect(anyButton()).toHaveClass("invisible")
      expect(anyButton()).toHaveAttribute("tabindex", "-1")

      scrollPageTo(600)

      expect(button()).toBeVisible()
      expect(button()).not.toHaveClass("invisible")

      scrollPageTo(0)

      expect(button()).toBeNull()
    })

    it("scrolls smoothly to the top and hands focus to the main content", async () => {
      renderWithMain(<ScrollToTopButton />)
      scrollPageTo(600)

      await userEvent.click(anyButton())

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" })
      expect(screen.getByRole("main")).toHaveFocus()
    })

    it("jumps without animation for someone who asks for reduced motion", async () => {
      preferReducedMotion(true)
      renderWithMain(<ScrollToTopButton />)
      scrollPageTo(600)

      await userEvent.click(anyButton())

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" })
    })

    it("moves focus where the page asks", async () => {
      render(
        <>
          <h1
            id="page-title"
            tabIndex={-1}
          >
            Titulek
          </h1>
          <ScrollToTopButton focusTargetId="page-title" />
        </>,
      )
      scrollPageTo(600)

      await userEvent.click(anyButton())

      expect(screen.getByRole("heading", { name: "Titulek" })).toHaveFocus()
    })
  })

  describe("with a target", () => {
    /** The target `top` px from the top of the window, as the page scrolls. */
    const renderTarget = () => {
      const scrollIntoView = vi.fn()
      render(
        <>
          <section
            id="participants"
            tabIndex={-1}
            aria-label="Účastníci"
            // Under a sticky header 56 px high, as the rating page does it.
            style={{ scrollMarginTop: "56px" }}
          />
          <ScrollToTopButton targetId="participants" />
        </>,
      )
      const target = screen.getByRole("region", { name: "Účastníci" })
      // The test setup stubs it on the prototype, read-only: shadow it here.
      Object.defineProperty(target, "scrollIntoView", { value: scrollIntoView })
      const placeTarget = (top: number) => {
        vi.spyOn(target, "getBoundingClientRect").mockReturnValue({ top } as DOMRect)
        act(() => {
          fireEvent.scroll(window)
        })
      }
      return { scrollIntoView, target, placeTarget }
    }

    it("shows only once the page is scrolled past the target", () => {
      const { placeTarget } = renderTarget()

      // Above the target: the page has not reached it yet.
      placeTarget(300)
      expect(button()).toBeNull()
      expect(anyButton()).toHaveClass("invisible")

      // At the target: right under the sticky header.
      placeTarget(56)
      expect(button()).toBeNull()

      // Half a pixel off after scrolling into view still counts as at it.
      placeTarget(55.5)
      expect(button()).toBeNull()

      // Past the target: it is above its place under the header.
      placeTarget(-800)
      expect(button()).toBeVisible()
    })

    it("brings the target back under the header and focuses it", async () => {
      const { scrollIntoView, target, placeTarget } = renderTarget()
      placeTarget(-800)

      await userEvent.click(anyButton())

      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" })
      expect(scrollTo).not.toHaveBeenCalled()
      expect(target).toHaveFocus()
    })

    it("does nothing at or above the target, even if pressed", async () => {
      const { scrollIntoView, target, placeTarget } = renderTarget()
      placeTarget(300)

      await userEvent.click(anyButton())

      expect(scrollIntoView).not.toHaveBeenCalled()
      expect(scrollTo).not.toHaveBeenCalled()
      expect(target).not.toHaveFocus()
    })

    it("goes by the page's top when the target is not on the page", async () => {
      renderWithMain(<ScrollToTopButton targetId="missing" />)
      expect(button()).toBeNull()

      scrollPageTo(600)
      await userEvent.click(anyButton())

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" })
      expect(screen.getByRole("main")).toHaveFocus()
    })
  })
})
