import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CountdownCard, timeUntil } from "@/components/hobbyhub/CountdownCard"
import { CardSeats, FreeSeatsLabel } from "@/components/hobbyhub/FreeSeats"
import { FriendsGoing } from "@/components/hobbyhub/FriendsGoing"
import { OrganizerCard } from "@/components/hobbyhub/OrganizerCard"
import { TicketCard, TicketTime } from "@/components/hobbyhub/TicketCard"

const seats = { taken: 3, min: 4, max: 6 }

describe("FreeSeatsLabel (#215)", () => {
  it("speaks of free seats, never of the minimum", () => {
    const { rerender } = render(
      <FreeSeatsLabel
        taken={3}
        max={6}
      />,
    )
    expect(screen.getByText("3 volná místa")).toBeInTheDocument()

    rerender(
      <FreeSeatsLabel
        taken={5}
        max={6}
      />,
    )
    expect(screen.getByText("Chybíš už jenom ty")).toBeInTheDocument()

    rerender(
      <FreeSeatsLabel
        taken={2}
        max={6}
      />,
    )
    expect(screen.getByText("Volno")).toHaveClass("text-success-ink")
  })
})

describe("CardSeats", () => {
  it("draws a small roster seat by seat", () => {
    render(<CardSeats {...seats} />)
    expect(screen.getByRole("img").querySelectorAll("[data-slot=activity-avatar]")).toHaveLength(6)
  })

  it("sums up a big roster: who goes, then at most three open seats", () => {
    render(
      <CardSeats
        taken={9}
        min={12}
        max={20}
      />,
    )
    const roster = screen.getByRole("img")
    expect(roster).toHaveAccessibleName("Obsazeno 9 z 20, chybí 3")
    expect(roster).toHaveTextContent("9")
    expect(roster.querySelectorAll("[data-slot=activity-avatar]")).toHaveLength(3)
  })
})

describe("FriendsGoing", () => {
  it("names one, two, or the first and how many more", () => {
    const anna = { name: "anna_k", photo: null }
    const tomas = { name: "tomas.b", photo: null }
    const mira = { name: "mira_z", photo: null }
    const { rerender, container } = render(<FriendsGoing friends={[]} />)
    expect(container).toBeEmptyDOMElement()

    rerender(<FriendsGoing friends={[anna]} />)
    expect(screen.getByText("anna_k jde")).toBeInTheDocument()
    rerender(<FriendsGoing friends={[anna, tomas]} />)
    expect(screen.getByText("anna_k a tomas.b jdou")).toBeInTheDocument()
    rerender(<FriendsGoing friends={[anna, tomas, mira]} />)
    expect(screen.getByText("anna_k a 2 další jdou")).toBeInTheDocument()
  })
})

describe("TicketCard", () => {
  it("shows the day and time on the stub and the free seats", () => {
    render(
      <TicketCard
        {...seats}
        title="Florbal pro každého"
        day="Dnes"
        time="19:00"
        place="Hala Letná, Praha 7"
        activity="florbal"
      />,
    )
    expect(screen.getByRole("heading", { name: "Florbal pro každého" })).toBeInTheDocument()
    expect(screen.getByText("19:00")).toBeInTheDocument()
    expect(screen.getByText("3 volná místa")).toBeInTheDocument()
  })

  it("stamps the stub with the viewer's seat or request, and keeps the free seats", () => {
    const props = { ...seats, title: "Florbal", day: "Dnes", time: "19:00", place: "Hala Letná" }
    const { rerender } = render(
      <TicketCard
        {...props}
        viewerState="JOINED"
      />,
    )
    expect(screen.getByText("✓ Jdeš").parentElement).toHaveClass("bg-success-soft")
    expect(screen.getByText("3 volná místa")).toBeInTheDocument()

    rerender(
      <TicketCard
        {...props}
        viewerState="PENDING"
      />,
    )
    expect(screen.getByText("Čeká na schválení").parentElement).toHaveClass("bg-pending-soft")
  })
})

describe("TicketTime", () => {
  it("keeps the clock big and puts AM or PM small under it", () => {
    const { rerender } = render(<TicketTime time="5:00 PM" />)
    expect(screen.getByText("5:00")).toHaveClass("typo-h3")
    expect(screen.getByText("PM")).toHaveClass("typo-caption")

    rerender(<TicketTime time="17:00" />)
    expect(screen.getByText("17:00")).toHaveClass("typo-h3")
  })
})

describe("OrganizerCard", () => {
  it("shows the organizer's score only when it is given", () => {
    const { rerender } = render(
      <OrganizerCard
        {...seats}
        title="Okruh kolem Slap"
        when="so 28. 11. · 9:00"
        organizerName="pedal_petra"
      />,
    )
    expect(screen.getByText("pedal_petra")).toBeInTheDocument()
    expect(screen.queryByRole("img", { name: /4,9/ })).not.toBeInTheDocument()

    rerender(
      <OrganizerCard
        {...seats}
        title="Okruh kolem Slap"
        when="so 28. 11. · 9:00"
        organizerName="pedal_petra"
        organizerScore={{ average: 4.9, count: 44 }}
      />,
    )
    expect(screen.getByRole("img", { name: /4,9/ })).toBeInTheDocument()
  })
})

describe("CountdownCard", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("splits the time left into hours, minutes and seconds", () => {
    const now = new Date("2026-11-19T15:00:00Z")
    expect(timeUntil(new Date("2026-11-19T17:19:55Z"), now)).toMatchObject({
      hours: 2,
      minutes: 19,
      seconds: 55,
    })
    expect(timeUntil(new Date("2026-11-19T14:00:00Z"), now).total).toBe(0)
  })

  it("counts down every second", () => {
    const now = new Date("2026-11-19T15:00:00Z")
    vi.setSystemTime(now)
    render(
      <CountdownCard
        {...seats}
        title="Malá kopaná"
        startAt={new Date("2026-11-19T15:20:05Z")}
        now={now}
        activityLabel="Fotbal"
        place="Kobylisy"
      />,
    )
    expect(screen.getByText("20 min 05 s")).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText("20 min 04 s")).toBeInTheDocument()
  })
})
