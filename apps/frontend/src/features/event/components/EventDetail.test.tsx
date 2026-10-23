import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { EventDetail as EventDetailData } from "@/features/event/api/eventSchemas"
import { EventDetail } from "@/features/event/components/EventDetail"

const NOW = new Date(2026, 9, 22, 8, 0)

const event = (overrides: Partial<EventDetailData> = {}): EventDetailData => ({
  id: "e1",
  title: "Čtvrteční florbal",
  imageUrl: null,
  startAt: new Date(2026, 9, 22, 19, 0),
  endAt: new Date(2026, 9, 22, 20, 30),
  venueType: "PUBLIC_VENUE",
  placeName: "ZŠ Kobylisy",
  district: "Praha 8",
  city: "Praha",
  level: "Pokročilí",
  activity: { id: "a1", name: "Florbal", icon: "florbal" },
  minParticipants: 8,
  maxParticipants: 10,
  takenCount: 5,
  description: "Přátelský zápas v tělocvičně.",
  equipment: "Hokejka a sálová obuv",
  contributionAmount: 80,
  contributionNote: null,
  status: "PUBLISHED",
  approvalMode: "MANUAL",
  organizerName: "Jana Nováková",
  stats: { included: 4, total: 5, medianAge: 36, gender: { male: 3, female: 1, unknown: 1 } },
  statsMinParticipants: 3,
  ...overrides,
})

const renderDetail = (overrides: Partial<EventDetailData> = {}) =>
  render(
    <EventDetail
      event={event(overrides)}
      activityLabel="Florbal"
      joinAction={<button type="button">Obsadit místo</button>}
      now={NOW}
    />,
  )

describe("EventDetail", () => {
  it("shows what a visitor needs to decide", () => {
    renderDetail()

    expect(screen.getByRole("heading", { level: 1, name: "Čtvrteční florbal" })).toBeInTheDocument()
    expect(screen.getByText("Florbal")).toBeInTheDocument()
    expect(screen.getByText("Přátelský zápas v tělocvičně.")).toBeInTheDocument()
    expect(screen.getByText("Dnes")).toBeInTheDocument()
    expect(screen.getByText("19:00")).toBeInTheDocument()
    expect(screen.getByText("do 20:30")).toBeInTheDocument()
    expect(screen.getByText("ZŠ Kobylisy, Praha 8")).toBeInTheDocument()
    expect(screen.getByText("Pokročilí")).toBeInTheDocument()
    expect(screen.getByText("Pořádá Jana Nováková")).toBeInTheDocument()
    expect(screen.getByText("Hokejka a sálová obuv")).toBeInTheDocument()
    expect(screen.getByText(/80\s*Kč/)).toBeInTheDocument()
    expect(screen.getByText("chybí 3 do minima")).toBeInTheDocument()
    expect(screen.getByText("5 z 10 míst")).toBeInTheDocument()
  })

  it("keeps the decimals and the note of the contribution", () => {
    renderDetail({ contributionAmount: 80.5, contributionNote: "platí se na místě" })

    expect(screen.getByText(/80,5\s*Kč · platí se na místě/)).toBeInTheDocument()
  })

  it("names the end date of an event that ends on another day", () => {
    renderDetail({ endAt: new Date(2026, 9, 24, 20, 30) })

    expect(screen.getByText(/do .*24.*20:30/)).toBeInTheDocument()
  })

  it("offers the seat while the event is open", () => {
    renderDetail()

    expect(screen.getByRole("button", { name: "Obsadit místo" })).toBeInTheDocument()
    expect(screen.getByText("Organizátor žádost schvaluje ručně.")).toBeInTheDocument()
  })

  it("shows the mix of participants adding up to the taken seats", () => {
    renderDetail({
      takenCount: 7,
      stats: { included: 5, total: 7, medianAge: 36, gender: { male: 5, female: 0, unknown: 2 } },
    })

    const figure = (label: string) => screen.getByText(label).nextElementSibling?.textContent
    expect(figure("Medián věku")).toBe("36")
    expect(figure("Muži")).toBe("5")
    expect(figure("Ženy")).toBe("0")
    expect(figure("Neuvedeno")).toBe("2")
    expect(screen.getByText("Věk a pohlaví známe u 5 z 7 přihlášených.")).toBeInTheDocument()
  })

  it("leaves out the unknown figure when everyone is counted", () => {
    renderDetail({
      stats: { included: 5, total: 5, medianAge: 36, gender: { male: 3, female: 2, unknown: 0 } },
    })

    expect(screen.queryByText("Neuvedeno")).not.toBeInTheDocument()
    expect(screen.queryByText(/Věk a pohlaví známe/)).not.toBeInTheDocument()
  })

  it("explains why the mix is missing when there are too few people", () => {
    renderDetail({ stats: null })

    expect(
      screen.getByText("Složení se ukáže, až bude na akci aspoň 3 přihlášených."),
    ).toBeInTheDocument()
  })

  it.each([
    ["a full event", { takenCount: 10 }, "Naplněno", "Akce je plná, o účast se nedá žádat."],
    [
      "a cancelled event",
      { status: "CANCELLED" as const },
      "Zrušeno",
      "Akce byla zrušena, o účast už se nedá žádat.",
    ],
    [
      "a finished event",
      { status: "FINISHED" as const },
      "Proběhlo",
      "Akce už proběhla, o účast se nedá žádat.",
    ],
    [
      "an event that was not held",
      { status: "NOT_HELD" as const },
      "Neuskutečnilo se",
      "Akce se neuskutečnila, o účast se nedá žádat.",
    ],
    [
      "an event that ended but was not closed yet",
      { endAt: new Date(2026, 9, 21, 20, 0) },
      "Proběhlo",
      "Akce už proběhla, o účast se nedá žádat.",
    ],
  ])("does not let anyone ask to join %s", (_name, overrides, badge, text) => {
    renderDetail(overrides)

    expect(screen.getByText(badge)).toBeInTheDocument()
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Obsadit místo" })).not.toBeInTheDocument()
  })

  it("does not promise a hidden address for a public venue", () => {
    renderDetail({ equipment: null, contributionAmount: null })

    expect(screen.queryByText("Přesná adresa po schválení")).not.toBeInTheDocument()
    expect(screen.queryByText("Odkaz po schválení")).not.toBeInTheDocument()
  })

  it("promises the link, not an address, for an online event", () => {
    renderDetail({ venueType: "ONLINE", placeName: null, district: null, city: null })

    expect(screen.getByText("Odkaz po schválení")).toBeInTheDocument()
    expect(screen.queryByText("Přesná adresa po schválení")).not.toBeInTheDocument()
  })
})
