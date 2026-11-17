import { useEffect, useRef, useState } from "react"

// Typing waits this long before it filters, so a word is not searched letter by letter.
export const SEARCH_DEBOUNCE_MS = 300

/**
 * The text of a search field whose value lives in the address. The field is
 * what the user typed; the address follows after a pause (`onCommit`). The
 * last text sent is remembered, so the address catching up never overwrites
 * what was typed in the meantime, while a change of the address on its own
 * (back button, a link, clearing the filters) shows in the field.
 */
export function useSearchText(
  committed: string,
  onCommit: (text: string) => void,
): [string, (text: string) => void] {
  const [text, setText] = useState(committed)
  const lastSent = useRef(committed)
  // The latest callback, so a new one each render does not restart the pause.
  const onCommitRef = useRef(onCommit)
  useEffect(() => {
    onCommitRef.current = onCommit
  })

  useEffect(() => {
    if (committed === lastSent.current) return
    lastSent.current = committed
    setText(committed)
  }, [committed])

  useEffect(() => {
    const next = text.trim()
    if (next === committed) return
    const timer = setTimeout(() => {
      lastSent.current = next
      onCommitRef.current(next)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, committed])

  return [text, setText]
}
