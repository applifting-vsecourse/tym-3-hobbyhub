import { ScheduleRow } from "@/components/hobbyhub/ScheduleRow"

/** The event as a sheet shows it above its form: one schedule row. */
export type RequestedEvent = {
  title: string
  /** Start time, e.g. "19:00". */
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
