import { useEffect } from "react"

const DEFAULT_TITLE = "HobbyHub"

type SeoProps = {
  title?: string
  /** #215: the page's own description for search results; otherwise the one in index.html stays. */
  description?: string
}

/** Sets the description meta, putting back what was there when the page is left. */
function useDescription(description: string | undefined) {
  useEffect(() => {
    if (!description) return
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) return
    const previous = meta.content
    meta.content = description
    return () => {
      meta.content = previous
    }
  }, [description])
}

export function Seo({ title, description }: SeoProps) {
  useEffect(() => {
    document.title = title ? `${title} • ${DEFAULT_TITLE}` : DEFAULT_TITLE
  }, [title])
  useDescription(description)
  return null
}
