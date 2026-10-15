import { useCallback, useSyncExternalStore } from "react"

/** Tailwind's `md` breakpoint: below it the app uses its phone layout. */
export const DESKTOP_QUERY = "(min-width: 48rem)"

/** Subscribes to a CSS media query and re-renders when it starts or stops matching. */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener("change", onChange)
      return () => media.removeEventListener("change", onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
