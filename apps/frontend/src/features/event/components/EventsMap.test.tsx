import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { EventsMap } from "@/features/event/components/EventsMap"

// WebGL does not exist in jsdom: a stand-in map that loads at once and puts its
// markers' elements into the page, which is all these tests look at.
vi.mock("mapbox-gl", () => {
  class FakeMap {
    private readonly handlers = new Map<string, () => void>()
    on(name: string, handler: () => void) {
      this.handlers.set(name, handler)
      if (name === "load") queueMicrotask(handler)
    }
    addControl = vi.fn()
    getZoom() {
      return 10
    }
    getContainer() {
      return { clientWidth: 800 }
    }
    getBounds() {
      return null
    }
    fitBounds = vi.fn()
    easeTo = vi.fn()
    setStyle = vi.fn()
    resize = vi.fn()
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
  class FakeBounds {
    extend() {
      return this
    }
  }
  return {
    default: {
      accessToken: "",
      Map: FakeMap,
      Marker: FakeMarker,
      LngLatBounds: FakeBounds,
      AttributionControl: class {},
      NavigationControl: class {},
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
    "ResizeObserver",
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    },
  )
})

const event = (overrides: Partial<EventListItem> = {}): EventListItem => ({
  id: "e1",
  title: "Čtvrteční florbal",
  imageUrl: null,
  startAt: new Date(2030, 0, 15, 19, 0),
  endAt: new Date(2030, 0, 15, 21, 0),
  venueType: "PUBLIC_VENUE",
  placeName: "ZŠ Kobylisy",
  district: "Praha 8",
  city: "Praha",
  level: null,
  latitude: 50.1297,
  longitude: 14.4421,
  distanceKm: null,
  activity: { id: "a1", name: "Florbal", icon: "florbal" },
  minParticipants: 8,
  maxParticipants: 10,
  takenCount: 6,
  ...overrides,
})

const renderMap = async (
  events: EventListItem[],
  props: { selectedId?: string | null; onSelect?: (id: string | null) => void } = {},
) => {
  const onSelect = props.onSelect ?? vi.fn()
  await renderWithRouter(
    <EventsMap
      events={events}
      activityLabel={(activity) => activity.name}
      userPosition={null}
      onBoundsChange={vi.fn()}
      fitKey={0}
      selectedId={props.selectedId ?? null}
      onSelect={onSelect}
    />,
  )
  return { onSelect }
}

describe("EventsMap", () => {
  it("puts a pin on the map for every event with a place, naming it for assistive technology", async () => {
    await renderMap([
      event(),
      event({ id: "e2", title: "Šachy v kavárně", latitude: 49.2, longitude: 16.6, takenCount: 8 }),
      event({ id: "online", title: "Online šachy", latitude: null, longitude: null }),
    ])

    expect(
      await screen.findByRole("button", { name: "Čtvrteční florbal, chybí 2" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Šachy v kavárně, naplněno" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Online šachy/ })).not.toBeInTheDocument()
  })

  it("groups events that are close together into one pin with their count", async () => {
    await renderMap([
      event({ id: "a", title: "Akce A" }),
      event({ id: "b", title: "Akce B", latitude: 50.1298 }),
      event({ id: "c", title: "Akce C", latitude: 50.1299 }),
    ])

    expect(await screen.findByRole("button", { name: "3 akce" })).toBeInTheDocument()
  })

  it("selects the event whose pin is clicked", async () => {
    const { onSelect } = await renderMap([event()])

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Čtvrteční florbal, chybí 2" }))

    expect(onSelect).toHaveBeenCalledWith("e1")
  })

  it("shows the card of the selected event over the map", async () => {
    await renderMap([event()], { selectedId: "e1" })

    expect(
      await screen.findByRole("link", { name: "Detail akce Čtvrteční florbal" }),
    ).toBeInTheDocument()
  })

  it("says so when no event has a place on the map", async () => {
    await renderMap([event({ latitude: null, longitude: null })])

    expect(await screen.findByText("Žádná akce s místem na mapě.")).toBeInTheDocument()
  })
})
