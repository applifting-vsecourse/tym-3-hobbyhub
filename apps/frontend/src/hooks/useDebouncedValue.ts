import { useEffect, useState } from "react"

/**
 * `value`, once it has stopped changing for `delayMs`. For what should not run
 * on every keystroke, e.g. asking the server about what is being typed.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
