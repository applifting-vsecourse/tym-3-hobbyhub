export type Activity = {
  id: string;
  name: string;
  // Key of the icon in the frontend (`ACTIVITIES` in ActivityIcon.tsx).
  icon: string;
  // Usual size of a game: the event form starts from these (F-05.1).
  defaultMinParticipants: number;
  defaultMaxParticipants: number;
};
