import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AddressSearch } from "@/components/hobbyhub/AddressSearch"

// The suggestions need a map token; the tests give one and answer the geocoder themselves.
vi.mock("@/config/env", () => ({
  env: {
    VITE_API_URL: "http://api.test/api",
    VITE_BETTER_AUTH_URL: "http://api.test",
    VITE_MAPBOX_TOKEN: "test-token",
  },
}))

const feature = (type: "address" | "street", name: string, fullAddress: string) => ({
  properties: {
    feature_type: type,
    name,
    full_address: fullAddress,
    context: {
      [type]: { name },
      postcode: { name: "110 00" },
      place: { name: "Praha" },
      country: { name: "Česko" },
    },
    coordinates: { latitude: 50.08, longitude: 14.42 },
  },
})

const ANSWER = {
  features: [
    feature("street", "Vodičkova", "Vodičkova, 110 00 Praha, Česko"),
    feature("address", "Vodičkova 3", "Vodičkova 3, 110 00 Praha, Česko"),
  ],
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json(ANSWER))),
  )
})

afterEach(() => vi.unstubAllGlobals())

const renderSearch = async (props: Partial<Parameters<typeof AddressSearch>[0]> = {}) => {
  const onSelect = vi.fn()
  const user = userEvent.setup()
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AddressSearch
        value=""
        placeholder="Najít adresu"
        onSelect={onSelect}
        {...props}
      />
    </QueryClientProvider>,
  )
  await user.click(screen.getByRole("combobox"))
  return { onSelect, user }
}

const type = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.keyboard(text)
}

describe("AddressSearch streets", () => {
  it("hides streets when they can be picked neither as they are nor by a handler", async () => {
    const { user } = await renderSearch()
    await type(user, "Vodičk")

    expect(await screen.findByRole("option", { name: /Vodičkova 3/ })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Vodičkova, 110 00 Praha, Česko" })).toBeNull()
  })

  it("picks a street as it is where a street is allowed", async () => {
    const { onSelect, user } = await renderSearch({ isStreetAllowed: true })
    await type(user, "Vodičk")
    await user.click(await screen.findByRole("option", { name: "Vodičkova, 110 00 Praha, Česko" }))

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ street: "Vodičkova", city: "Praha", postalCode: "110 00" }),
    )
    expect(onSelect.mock.calls[0]?.[0]).not.toHaveProperty("isStreet")
  })

  it("hands a street to its own handler, not to onSelect, where it is not allowed as it is", async () => {
    const onSelectStreet = vi.fn()
    const { onSelect, user } = await renderSearch({ onSelectStreet })
    await type(user, "Vodičk")
    await user.click(await screen.findByRole("option", { name: "Vodičkova, 110 00 Praha, Česko" }))

    expect(onSelectStreet).toHaveBeenCalledWith(expect.objectContaining({ street: "Vodičkova" }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("asks only for exact addresses once a house number is typed", async () => {
    const { user } = await renderSearch()
    await type(user, "Vodičkova 3")
    await screen.findByRole("option", { name: /Vodičkova 3/ })

    const [requested] = vi.mocked(fetch).mock.calls.at(-1) ?? []
    expect(new URL(requested as string).searchParams.get("types")).toBe("address")
  })
})
