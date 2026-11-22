import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import { HTTPError } from "ky"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { PublicProfilePage } from "@/features/profile/components/PublicProfilePage"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get },
}))

const answer = (body: unknown) => get.mockReturnValueOnce({ json: () => Promise.resolve(body) })

const renderPage = (
  userId: string,
  reportAction?: (profile: { id: string; name: string }) => React.ReactNode,
) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PublicProfilePage
        userId={userId}
        ownUserId="me"
        activityLabel={(activity) => activity.name}
        renderFriendAction={({ relation }) => <p>{`relation:${relation}`}</p>}
        reportAction={reportAction}
      />
    </QueryClientProvider>,
  )

describe("PublicProfilePage", () => {
  beforeEach(() => get.mockReset())

  it("loads the profile of another person", async () => {
    answer({
      id: "u2",
      name: "Petr",
      relation: "request_sent",
      bio: null,
      image: null,
      cover: null,
      interests: [],
      ratings: {
        asOrganizer: { count: null, average: null },
        asParticipant: { count: null, average: null },
      },
      isBlockedByMe: false,
    })
    await renderPage("u2")

    expect(await screen.findByRole("heading", { level: 1, name: "Petr" })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("profile/u2")
    // #225: my relation to the person comes with the profile.
    expect(screen.getByText("relation:request_sent")).toBeInTheDocument()
  })

  // #240: the route hands in "Nahlásit uživatele" for the loaded person.
  it("offers the report action for the loaded person", async () => {
    answer({
      id: "u2",
      name: "Petr",
      relation: "none",
      bio: null,
      image: null,
      cover: null,
      interests: [],
      ratings: {
        asOrganizer: { count: null, average: null },
        asParticipant: { count: null, average: null },
      },
      isBlockedByMe: false,
    })
    await renderPage("u2", (profile) => (
      <button type="button">{`Nahlásit ${profile.name} (${profile.id})`}</button>
    ))

    expect(await screen.findByRole("button", { name: "Nahlásit Petr (u2)" })).toBeInTheDocument()
  })

  it("sends me to my own profile instead of this page", async () => {
    const { router } = await renderPage("me")

    await vi.waitFor(() => expect(router.state.location.pathname).toBe("/profile"))
    expect(get).not.toHaveBeenCalled()
  })

  it("says so when the profile does not exist", async () => {
    const response = new Response("{}", { status: 404 })
    get.mockReturnValueOnce({
      json: () =>
        Promise.reject(
          new HTTPError(response, new Request("http://x/api/profile/nope"), {} as never),
        ),
    })
    await renderPage("nope")

    expect(await screen.findByText("Profil nenalezen.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /znovu|načíst/i })).toBeNull()
  })
})
