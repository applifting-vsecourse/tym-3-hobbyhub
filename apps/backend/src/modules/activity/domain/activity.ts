export type Activity = {
  id: string;
  name: string;
  // Key of the activity in the frontend (`ACTIVITIES` in ActivityIcon.tsx): its
  // translation and icon. One without its own drawing shows its category's icon.
  icon: string;
  // Usual size of a game: the event form starts from these (F-05.1).
  defaultMinParticipants: number;
  defaultMaxParticipants: number;
};

// Main category of activities, e.g. "Míčové sporty" (ADR-0020).
export type ActivityCategory = {
  id: string;
  name: string;
  // Key of the category in the frontend (`CATEGORIES` in ActivityIcon.tsx).
  icon: string;
  // Position in pickers and filters.
  order: number;
};

// What the activity lookup offers: pickers group activities by category, the
// onboarding shows the most popular first.
export type ActivityWithCategory = Activity & {
  category: ActivityCategory;
  // Place among the most popular (1 = most popular); null for the rest.
  popularityRank: number | null;
};
