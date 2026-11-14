import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { DiscoverGroups } from "@/features/group/components/DiscoverGroups"

const get = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const emptyPage = () => ({ json: () => Promise.resolve({ items: [], nextCursor: null }) })

const noFilters = { activityIds: [], search: "", location: "" }

const renderDiscover = (props: Partial<Parameters<typeof DiscoverGroups>[0]> = {}) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <DiscoverGroups
        viewerId={null}
        activityLabel={(activity) => activity.name}
        filters={noFilters}
        filtersBar={<div>filters bar</div>}
        onClearFilters={() => undefined}
        {...props}
      />
    </QueryClientProvider>,
  )

describe("DiscoverGroups", () => {
  beforeEach(() => get.mockReset().mockImplementation(emptyPage))

  it("asks the server for the filters of the address", async () => {
    await renderDiscover({
      filters: { activityIds: ["a1", "a2"], search: "volej", location: "Praha" },
    })

    await screen.findByText("Nic nenalezeno")
    const [path, options] = get.mock.calls[0] as [string, { searchParams: URLSearchParams }]
    expect(path).toBe("groups/discover")
    expect(options.searchParams.toString()).toBe(
      "activityIds=a1&activityIds=a2&search=volej&location=Praha",
    )
  })

  it("says nothing matches and clears the filters", async () => {
    const onClearFilters = vi.fn()

    await renderDiscover({ filters: { ...noFilters, search: "xyz" }, onClearFilters })

    await userEvent.click(await screen.findByRole("button", { name: "Vymazat filtry" }))
    expect(onClearFilters).toHaveBeenCalledOnce()
  })

  it("keeps the plain empty sentence when no filter is on", async () => {
    await renderDiscover()

    expect(await screen.findByText("Zatím tu není žádná veřejná skupina.")).toBeInTheDocument()
    expect(screen.queryByText("Nic nenalezeno")).not.toBeInTheDocument()
  })
})
