import { ScheduleRow } from "@/components/hobbyhub/ScheduleRow"

/** The event as a sheet shows it above its form: one schedule row. */
export type RequestedEvent = {
  title: string
  /** Start date, e.g. "15. 10." or "Dnes". */
  day: string
  /** Under the date, e.g. "čt 19:00". */
  time: string
  /** Place and level, e.g. "ZŠ Kobylisy, Praha 8, Pokročilí". */
  place: string
  taken: number
  min: number
  max: number
}

export function RequestedEventRow({ event }: { event: RequestedEvent }) {
  return (
    <ScheduleRow
      day={event.day}
      time={event.time}
      title={event.title}
      subtitle={event.place}
      taken={event.taken}
      min={event.min}
      max={event.max}
      className="border-t-0"
    />
  )
}
