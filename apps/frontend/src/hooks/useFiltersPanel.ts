import { useState } from "react"

import { useMediaQuery } from "@/hooks/useMediaQuery"

/** Tailwind's `xl` breakpoint: from here the filters sit in a side panel instead of a dialog (#224). */
export const FILTERS_PANEL_QUERY = "(min-width: 80rem)"

const STORAGE_KEY = "hobbyhub.filtersPanel.collapsed"

// Storage may be missing or refuse access (private window, blocked site data):
// the panel is then simply open.
const readCollapsed = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

const writeCollapsed = (isCollapsed: boolean) => {
  try {
    if (isCollapsed) window.localStorage.setItem(STORAGE_KEY, "true")
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Not remembered; it still works for this visit.
  }
}

/**
 * The side panel of filters on a large screen: whether there is room for it and
 * whether the visitor folded it away. The fold is remembered in this browser,
 * the same for every page that has the panel.
 */
export function useFiltersPanel() {
  const isWide = useMediaQuery(FILTERS_PANEL_QUERY)
  const [isExpanded, setIsExpanded] = useState(() => !readCollapsed())
  const setExpanded = (isOpen: boolean) => {
    setIsExpanded(isOpen)
    writeCollapsed(!isOpen)
  }
  return { isWide, isExpanded, setExpanded }
}

export type FiltersPanelState = ReturnType<typeof useFiltersPanel>
