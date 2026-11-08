import type {
  DecidedStatus,
  SeatStatus,
} from "@/features/participation-request/api/participationRequestSchemas"

export const participationRequestKeys = {
  all: () => ["participation-requests"] as const,
  // Per user too, so the next person signing in on this device never sees the
  // request state of the one before.
  mine: (eventId: string, userId: string) =>
    [...participationRequestKeys.all(), "mine", eventId, userId] as const,
  // The organizer's list of waiting requests (F-05.7).
  pending: (eventId: string) => [...participationRequestKeys.all(), "pending", eventId] as const,
  // The rejected and withdrawn under the waiting requests (F-05.6).
  decidedAll: (eventId: string) => [...participationRequestKeys.all(), "decided", eventId] as const,
  decided: (eventId: string, status: DecidedStatus) =>
    [...participationRequestKeys.decidedAll(eventId), status] as const,
  // The seats on the participants tab, taken or given back (F-05.6, F-06.4).
  participantsAll: (eventId: string) =>
    [...participationRequestKeys.all(), "participants", eventId] as const,
  participants: (eventId: string, status: SeatStatus) =>
    [...participationRequestKeys.participantsAll(eventId), status] as const,
}
