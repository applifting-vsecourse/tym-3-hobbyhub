import { render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"

import type { ParticipantInfo as ParticipantInfoData } from "@/features/event/api/eventSchemas"
import { ParticipantInfo } from "@/features/event/components/ParticipantInfo"

// WebGL does not exist in jsdom: a stand-in map that loads at once and puts its
// marker's element into the page, which is all these tests look at.
vi.mock("mapbox-gl", () => {
  class FakeMap {
    on(name: string, handler: () => void) {
      if (name === "load") queueMicrotask(handler)
    }
    addControl = vi.fn()
    setStyle = vi.fn()
    remove = vi.fn()
  }
  class FakeMarker {
    constructor(private readonly options: { element: HTMLElement }) {}
    setLngLat() {
      return this
    }
    addTo() {
      document.body.append(this.options.element)
      return this
    }
    remove() {
      this.options.element.remove()
    }
  }
  return {
    default: {
      accessToken: "",
      Map: FakeMap,
      Marker: FakeMarker,
      AttributionControl: class {},
    },
  }
})

vi.mock("@/config/env", () => ({
  env: {
    VITE_API_URL: "http://api.test/api",
    VITE_BETTER_AUTH_URL: "http://api.test",
    VITE_MAPBOX_TOKEN: "test-token",
  },
}))

beforeAll(() => {
  vi.stubGlobal(
    "MutationObserver",
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    },
  )
})

const info = (overrides: Partial<ParticipantInfoData> = {}): ParticipantInfoData => ({
  venueType: "PUBLIC_VENUE",
  location: {
    street: "Chabařovická 4",
    city: "Praha 8",
    postalCode: "182 00",
    country: "Česko",
    placeName: "ZŠ Kobylisy",
    latitude: 50.1297,
    longitude: 14.4421,
  },
  organizerName: "Jana Nováková",
  externalChatUrl: "https://chat.whatsapp.com/abc",
  contact: "+420 777 123 456",
  ...overrides,
})

const pin = { activity: "florbal", title: "Čtvrteční florbal", state: "missing" as const }

describe("ParticipantInfo", () => {
  it("shows the exact address, the map and a navigation link", async () => {
    render(
      <ParticipantInfo
        info={info()}
        pin={pin}
      />,
    )

    expect(screen.getByRole("heading", { level: 2, name: "Kde se sejdeme" })).toBeInTheDocument()
    expect(screen.getByText("ZŠ Kobylisy")).toBeInTheDocument()
    expect(screen.getByText("Chabařovická 4")).toBeInTheDocument()
    expect(screen.getByText("182 00 Praha 8")).toBeInTheDocument()
    expect(await screen.findByRole("region", { name: "Mapa s místem akce" })).toBeInTheDocument()
    // A computer, as jsdom is, opens Google Maps in a new tab.
    const navigate = screen.getByRole("link", { name: "Navigovat" })
    expect(navigate).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=50.1297%2C14.4421",
    )
    expect(navigate).toHaveAttribute("target", "_blank")
    expect(navigate).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("shows both the chat and the contact, each linking to its app", () => {
    render(
      <ParticipantInfo
        info={info()}
        pin={pin}
      />,
    )

    expect(screen.getByRole("link", { name: "Skupinový chat" })).toHaveAttribute(
      "href",
      "https://chat.whatsapp.com/abc",
    )
    expect(screen.getByRole("link", { name: "Zavolat +420 777 123 456" })).toHaveAttribute(
      "href",
      "tel:+420777123456",
    )
    expect(screen.getByText("Organizátor: Jana Nováková")).toBeInTheDocument()
  })

  it("links an e-mail contact to the mail app", () => {
    render(
      <ParticipantInfo
        info={info({ contact: "jana@example.com", externalChatUrl: null })}
        pin={pin}
      />,
    )

    expect(screen.getByRole("link", { name: "jana@example.com" })).toHaveAttribute(
      "href",
      "mailto:jana@example.com",
    )
    expect(screen.queryByRole("link", { name: "Skupinový chat" })).not.toBeInTheDocument()
  })

  it("leaves out the contacts the organizer did not fill in", () => {
    render(
      <ParticipantInfo
        info={info({ contact: null, externalChatUrl: null })}
        pin={pin}
      />,
    )

    expect(
      screen.queryByRole("heading", { name: "Spojení s organizátorem" }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Navigovat" })).toBeInTheDocument()
  })

  it("navigates by the written address when the place has no position, and draws no map", () => {
    render(
      <ParticipantInfo
        info={info({
          location: { ...info().location!, latitude: null, longitude: null },
        })}
        pin={pin}
      />,
    )

    expect(screen.queryByRole("region", { name: "Mapa s místem akce" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Navigovat" })).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("Chabařovická 4, 182 00 Praha 8, Česko")),
    )
  })

  it("shows only the contacts of an online event", () => {
    render(
      <ParticipantInfo
        info={info({ venueType: "ONLINE", location: null })}
        pin={pin}
      />,
    )

    expect(screen.queryByRole("link", { name: "Navigovat" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Zavolat +420 777 123 456" })).toBeInTheDocument()
  })

  it("renders nothing when there is nothing to show", () => {
    const { container } = render(
      <ParticipantInfo
        info={info({
          location: null,
          contact: null,
          externalChatUrl: null,
        })}
        pin={pin}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
