import { useCallback, useEffect, useRef, useState } from "react"

// The reading line, as a share of the viewport's height: an element is "where
// the reader is" once its top has scrolled above it.
const READING_LINE = 0.45

/**
 * Which of `count` elements the reader is at as the page scrolls: the last one
 * whose top is above the reading line, so the ones before it can be drawn as
 * done and the ones after it as still to come; `-1` while none is. At the very
 * bottom of the page it is the last one, even when the page is too short for
 * it to reach the line. Measured on every scroll and resize: a handful of
 * rectangles, and the state only changes when the answer does.
 */
export function useRevealOnScroll(count: number) {
  const elements = useRef<(Element | null)[]>([])
  const [active, setActive] = useState(-1)

  // Stable per index, so the ref callback does not re-run on every render.
  const register = useCallback(
    (index: number) => (element: Element | null) => {
      elements.current[index] = element
    },
    [],
  )

  useEffect(() => {
    const measure = () => {
      const line = window.innerHeight * READING_LINE
      const isAtBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1
      let next = -1
      elements.current.forEach((element, index) => {
        if (element && element.getBoundingClientRect().top <= line) next = index
      })
      setActive(isAtBottom ? count - 1 : next)
    }
    measure()
    window.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)
    return () => {
      window.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
    }
  }, [count])

  return { active, register }
}
